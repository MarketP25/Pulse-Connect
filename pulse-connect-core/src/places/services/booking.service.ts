import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { FeeService } from "./fee.service";

export interface Booking {
  id: string;
  place_id: string;
  booker_id: string;
  host_id: string;
  slot_start: Date;
  slot_end: Date;
  guest_count: number;
  base_price_usd: number;
  booking_fee_usd: number;
  taxes_usd: number;
  deposit_usd: number;
  total_usd: number;
  fx_rate: number;
  currency: string;
  status: string;
  payment_status: string;
  policy_version: string;
  trace_id: string;
}

export interface BookingRequest {
  place_id: string;
  booker_id: string;
  slot_start: Date;
  slot_end: Date;
  guest_count: number;
  special_requests?: string;
}

export interface BookingCalculation {
  base_price_usd: number;
  booking_fee_usd: number;
  taxes_usd: number;
  deposit_usd: number;
  total_usd: number;
  breakdown: {
    slot_price: number;
    platform_service_fee: number;
    taxes: number;
    deposit: number;
    total: number;
  };
  policy_version: string;
  trace_id: string;
}

export class BookingService {
  constructor(
    private pool: Pool,
    private feeService: FeeService
  ) {}

  /**
   * Calculate booking costs including 3% platform fee
   */
  async calculateBooking(
    bookingRequest: BookingRequest,
    traceId?: string
  ): Promise<BookingCalculation> {
    const finalTraceId = traceId || uuidv4();

    // Get place pricing
    const place = await this.getPlaceForBooking(bookingRequest.place_id);
    if (!place) {
      throw new Error("Place not found");
    }

    // Calculate duration in hours
    const durationHours =
      (bookingRequest.slot_end.getTime() - bookingRequest.slot_start.getTime()) / (1000 * 60 * 60);

    // Get base price from place pricing (assuming hourly pricing)
    const hourlyRate = place.pricing.hourly_usd || place.pricing.daily_usd / 24;
    const basePriceUsd = Math.round(hourlyRate * durationHours * 100) / 100;

    // Calculate booking fee (3%)
    const feeCalculation = await this.feeService.calculateBookingFee(basePriceUsd, finalTraceId);

    // Calculate taxes (example: 8% tax rate)
    const taxRate = 0.08;
    const taxesUsd =
      Math.round((basePriceUsd + feeCalculation.booking_fee_usd) * taxRate * 100) / 100;

    // Calculate deposit (20% of total)
    const depositRate = 0.2;
    const depositUsd =
      Math.round((basePriceUsd + feeCalculation.booking_fee_usd + taxesUsd) * depositRate * 100) /
      100;

    // Total calculation
    const totalUsd = basePriceUsd + feeCalculation.booking_fee_usd + taxesUsd;

    return {
      base_price_usd: basePriceUsd,
      booking_fee_usd: feeCalculation.booking_fee_usd,
      taxes_usd: taxesUsd,
      deposit_usd: depositUsd,
      total_usd: totalUsd,
      breakdown: {
        slot_price: basePriceUsd,
        platform_service_fee: feeCalculation.booking_fee_usd,
        taxes: taxesUsd,
        deposit: depositUsd,
        total: totalUsd
      },
      policy_version: feeCalculation.policy_version,
      trace_id: finalTraceId
    };
  }

  /**
   * Create booking with immediate fee capture
   */
  async createBooking(bookingRequest: BookingRequest, traceId?: string): Promise<Booking> {
    const client = await this.pool.connect();
    const finalTraceId = traceId || uuidv4();

    try {
      await client.query("BEGIN");

      // Check availability
      const isAvailable = await this.checkAvailability(client, bookingRequest);
      if (!isAvailable) {
        throw new Error("Requested time slot is not available");
      }

      // Calculate costs
      const calculation = await this.calculateBooking(bookingRequest, finalTraceId);

      // Get place and host info
      const place = await this.getPlaceForBooking(bookingRequest.place_id);
      if (!place) {
        throw new Error("Place not found");
      }

      // Process payment (immediate capture of booking fee)
      const paymentSuccess = await this.processBookingPayment(
        bookingRequest.booker_id,
        calculation.total_usd,
        calculation.deposit_usd,
        finalTraceId
      );

      if (!paymentSuccess) {
        throw new Error("Payment processing failed");
      }

      // Create booking record
      const bookingId = uuidv4();
      const result = await client.query(
        `
        INSERT INTO bookings (
          id, place_id, booker_id, host_id, slot_start, slot_end, guest_count,
          base_price_usd, booking_fee_usd, taxes_usd, deposit_usd, total_usd,
          fx_rate, currency, status, payment_status, policy_version, trace_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `,
        [
          bookingId,
          bookingRequest.place_id,
          bookingRequest.booker_id,
          place.host_id,
          bookingRequest.slot_start.toISOString(),
          bookingRequest.slot_end.toISOString(),
          bookingRequest.guest_count,
          calculation.base_price_usd,
          calculation.booking_fee_usd,
          calculation.taxes_usd,
          calculation.deposit_usd,
          calculation.total_usd,
          1.0, // fx_rate
          "USD",
          "confirmed",
          "paid",
          calculation.policy_version,
          finalTraceId
        ]
      );

      // Create transaction record for booking fee
      await this.createBookingFeeTransaction(client, bookingId, calculation, finalTraceId);

      // Emit booking fee charged event
      await this.emitEvent("booking_fee_charged", {
        booking_id: bookingId,
        place_id: bookingRequest.place_id,
        booker_id: bookingRequest.booker_id,
        host_id: place.host_id,
        booking_fee_usd: calculation.booking_fee_usd,
        total_usd: calculation.total_usd,
        policy_version: calculation.policy_version,
        trace_id: finalTraceId
      });

      await client.query("COMMIT");

      return this.mapBookingRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel booking (with refund policy)
   */
  async cancelBooking(bookingId: string, bookerId: string, reason?: string): Promise<Booking> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Get booking
      const booking = await this.getBookingByIdAndBooker(client, bookingId, bookerId);
      if (!booking) {
        throw new Error("Booking not found or access denied");
      }

      if (booking.status !== "confirmed") {
        throw new Error("Only confirmed bookings can be cancelled");
      }

      // Calculate refund (simplified: full refund if >24h before, 50% if <24h)
      const hoursUntilStart = (booking.slot_start.getTime() - Date.now()) / (1000 * 60 * 60);
      let refundAmount = 0;

      if (hoursUntilStart > 24) {
        refundAmount = booking.total_usd; // Full refund
      } else if (hoursUntilStart > 0) {
        refundAmount = booking.total_usd * 0.5; // 50% refund
      }
      // No refund if booking starts within 1 hour

      // Process refund if applicable
      if (refundAmount > 0) {
        await this.processRefund(bookerId, refundAmount, bookingId);
      }

      // Update booking status
      const result = await client.query(
        `
        UPDATE bookings
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
        [bookingId]
      );

      await client.query("COMMIT");

      return this.mapBookingRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get bookings by booker
   */
  async getBookingsByBooker(bookerId: string): Promise<Booking[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM bookings
      WHERE booker_id = $1
      ORDER BY created_at DESC
    `,
      [bookerId]
    );

    return result.rows.map((row) => this.mapBookingRow(row));
  }

  /**
   * Get bookings by host
   */
  async getBookingsByHost(hostId: string): Promise<Booking[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM bookings
      WHERE host_id = $1
      ORDER BY created_at DESC
    `,
      [hostId]
    );

    return result.rows.map((row) => this.mapBookingRow(row));
  }

  private async getPlaceForBooking(placeId: string): Promise<any> {
    const result = await this.pool.query(
      `
      SELECT p.*, pricing
      FROM places p
      WHERE p.id = $1 AND p.status = 'published'
    `,
      [placeId]
    );

    return result.rows[0] || null;
  }

  private async checkAvailability(client: any, bookingRequest: BookingRequest): Promise<boolean> {
    // Check for conflicting bookings
    const conflicts = await client.query(
      `
      SELECT COUNT(*) as count FROM bookings
      WHERE place_id = $1
      AND status IN ('confirmed', 'pending')
      AND (
        (slot_start <= $2 AND slot_end > $2) OR
        (slot_start < $3 AND slot_end >= $3) OR
        (slot_start >= $2 AND slot_end <= $3)
      )
    `,
      [
        bookingRequest.place_id,
        bookingRequest.slot_start.toISOString(),
        bookingRequest.slot_end.toISOString()
      ]
    );

    return parseInt(conflicts.rows[0].count) === 0;
  }

  private async processBookingPayment(
    bookerId: string,
    totalAmount: number,
    depositAmount: number,
    traceId: string
  ): Promise<boolean> {
    // Integration with payment processor
    // For now, assume payment succeeds
    console.log(
      `Processing booking payment: $${totalAmount} (deposit: $${depositAmount}) for booker ${bookerId}, trace: ${traceId}`
    );
    return true;
  }

  private async processRefund(
    bookerId: string,
    refundAmount: number,
    bookingId: string
  ): Promise<void> {
    // Process refund through payment processor
    console.log(`Processing refund: $${refundAmount} for booking ${bookingId}, booker ${bookerId}`);
  }

  private async createBookingFeeTransaction(
    client: any,
    bookingId: string,
    calculation: BookingCalculation,
    traceId: string
  ): Promise<void> {
    // Create transaction record for booking fee
    await client.query(
      `
      INSERT INTO transactions (
        transaction_id, transaction_type, reference_id, reference_price_usd,
        gross_usd, fee_usd, net_usd, policy_version, trace_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        uuidv4(),
        "booking_fee",
        bookingId,
        calculation.base_price_usd,
        calculation.total_usd,
        calculation.booking_fee_usd,
        calculation.base_price_usd, // Net to host (fee goes to platform)
        calculation.policy_version,
        traceId
      ]
    );
  }

  private async getBookingByIdAndBooker(
    client: any,
    bookingId: string,
    bookerId: string
  ): Promise<Booking | null> {
    const result = await client.query(
      `
      SELECT * FROM bookings WHERE id = $1 AND booker_id = $2
    `,
      [bookingId, bookerId]
    );

    return result.rows[0] ? this.mapBookingRow(result.rows[0]) : null;
  }

  private mapBookingRow(row: any): Booking {
    return {
      id: row.id,
      place_id: row.place_id,
      booker_id: row.booker_id,
      host_id: row.host_id,
      slot_start: new Date(row.slot_start),
      slot_end: new Date(row.slot_end),
      guest_count: row.guest_count,
      base_price_usd: parseFloat(row.base_price_usd),
      booking_fee_usd: parseFloat(row.booking_fee_usd),
      taxes_usd: parseFloat(row.taxes_usd),
      deposit_usd: parseFloat(row.deposit_usd),
      total_usd: parseFloat(row.total_usd),
      fx_rate: parseFloat(row.fx_rate),
      currency: row.currency,
      status: row.status,
      payment_status: row.payment_status,
      policy_version: row.policy_version,
      trace_id: row.trace_id
    };
  }

  private async emitEvent(eventType: string, payload: any): Promise<void> {
    // Event emission logic would go here
    console.log(`Emitting event: ${eventType}`, payload);
  }
}
