import { sendEmail } from "./transport";
import { Booking } from "../booking/types";
import { PaymentResponse } from "../payment.ts/types";
import { logger } from "@/lib/logger";

export async function sendBookingConfirmation(
  booking: Booking
): Promise<boolean> {
  try {
    return await sendEmail({
      to: booking.userId, // Assuming userId is the email
      subject: "Booking Confirmation - Pulse Connect",
      template: "booking-confirmation",
      context: {
        bookingId: booking.id,
        checkIn: booking.checkIn.toLocaleDateString(),
        checkOut: booking.checkOut.toLocaleDateString(),
        guests: booking.guests,
        amount: `${booking.currency} ${booking.totalAmount.toFixed(2)}`,
      },
    });
  } catch (error) {
    logger.error("Failed to send booking confirmation:", error);
    return false;
  }
}

export async function sendPaymentConfirmation(
  payment: PaymentResponse,
  email: string
): Promise<boolean> {
  try {
    return await sendEmail({
      to: email,
      subject: "Payment Confirmation - Pulse Connect",
      template: "payment-confirmation",
      context: {
        sessionId: payment.sessionId,
        amount: payment.metadata?.amount,
        currency: payment.metadata?.currency,
        description: payment.metadata?.description,
      },
    });
  } catch (error) {
    logger.error("Failed to send payment confirmation:", error);
    return false;
  }
}

export async function sendBookingReminder(booking: Booking): Promise<boolean> {
  try {
    return await sendEmail({
      to: booking.userId,
      subject: "Upcoming Booking Reminder - Pulse Connect",
      template: "booking-reminder",
      context: {
        checkIn: booking.checkIn.toLocaleDateString(),
        checkOut: booking.checkOut.toLocaleDateString(),
        guests: booking.guests,
      },
    });
  } catch (error) {
    logger.error("Failed to send booking reminder:", error);
    return false;
  }
}
