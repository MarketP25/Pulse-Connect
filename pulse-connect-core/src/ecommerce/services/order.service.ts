import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { FeeService } from "./fee.service";

export interface Order {
  id: string;
  buyer_email: string;
  buyer_name?: string;
  currency: string;
  fx_rate: number;
  fx_timestamp: Date;
  subtotal_usd: number;
  shipping_usd: number;
  tax_usd: number;
  total_usd: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
  shipping_address: any; // JSONB
  billing_address?: any; // JSONB
  trace_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_usd: number;
  total_price_usd: number;
  seller_id: string;
  created_at: Date;
}

export interface CreateOrderRequest {
  buyer_email: string;
  buyer_name?: string;
  currency: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  shipping_address: any;
  billing_address?: any;
  trace_id: string;
}

export interface OrderPaymentRequest {
  order_id: string;
  payment_method_id: string;
  trace_id: string;
}

export class OrderService {
  constructor(
    private pool: Pool,
    private feeService: FeeService
  ) {}

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Validate products exist and are active
      const productIds = request.items.map((item) => item.product_id);
      const products = await client.query(
        `
        SELECT p.id, p.price_usd, p.inventory_count, p.seller_id, p.is_active
        FROM products p
        WHERE p.id = ANY($1) AND p.is_active = true AND p.is_deleted = false
      `,
        [productIds]
      );

      if (products.rows.length !== productIds.length) {
        throw new Error("One or more products not found or inactive");
      }

      // Check inventory
      for (const item of request.items) {
        const product = products.rows.find((p) => p.id === item.product_id);
        if (!product || product.inventory_count < item.quantity) {
          throw new Error(`Insufficient inventory for product ${item.product_id}`);
        }
      }

      // Calculate order totals
      let subtotalUsd = 0;
      const orderItems: OrderItem[] = [];

      for (const item of request.items) {
        const product = products.rows.find((p) => p.id === item.product_id);
        const totalPrice = product.price_usd * item.quantity;
        subtotalUsd += totalPrice;

        orderItems.push({
          id: uuidv4(),
          order_id: "", // Will be set after order creation
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price_usd: product.price_usd,
          total_price_usd: totalPrice,
          seller_id: product.seller_id,
          created_at: new Date()
        });
      }

      // For now, set shipping and tax to 0 (handled by sellers)
      const shippingUsd = 0;
      const taxUsd = 0;
      const totalUsd = subtotalUsd + shippingUsd + taxUsd;

      // Get FX rate (simplified - in production would call FX service)
      const fxRate = 1.0; // USD base
      const fxTimestamp = new Date();

      // Create order
      const orderId = uuidv4();
      const orderResult = await client.query(
        `
        INSERT INTO orders (
          id, buyer_email, buyer_name, currency, fx_rate, fx_timestamp,
          subtotal_usd, shipping_usd, tax_usd, total_usd, status,
          shipping_address, billing_address, trace_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *
      `,
        [
          orderId,
          request.buyer_email,
          request.buyer_name || null,
          request.currency,
          fxRate,
          fxTimestamp.toISOString(),
          subtotalUsd,
          shippingUsd,
          taxUsd,
          totalUsd,
          "pending",
          JSON.stringify(request.shipping_address),
          request.billing_address ? JSON.stringify(request.billing_address) : null,
          request.trace_id
        ]
      );

      // Create order items
      for (const item of orderItems) {
        item.order_id = orderId;
        await client.query(
          `
          INSERT INTO order_items (
            id, order_id, product_id, quantity, unit_price_usd, total_price_usd, seller_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `,
          [
            item.id,
            item.order_id,
            item.product_id,
            item.quantity,
            item.unit_price_usd,
            item.total_price_usd,
            item.seller_id
          ]
        );

        // Update product inventory
        await client.query(
          `
          UPDATE products
          SET inventory_count = inventory_count - $1, updated_at = NOW()
          WHERE id = $2
        `,
          [item.quantity, item.product_id]
        );
      }

      await client.query("COMMIT");
      return this.mapOrderRow(orderResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM orders WHERE id = $1
    `,
      [orderId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapOrderRow(result.rows[0]);
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at
    `,
      [orderId]
    );

    return result.rows.map((row) => this.mapOrderItemRow(row));
  }

  async processPayment(request: OrderPaymentRequest): Promise<Order> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Get order
      const order = await client.query(
        `
        SELECT * FROM orders WHERE id = $1 AND status = 'pending'
      `,
        [request.order_id]
      );

      if (order.rows.length === 0) {
        throw new Error("Order not found or not payable");
      }

      const orderData = this.mapOrderRow(order.rows[0]);

      // Get current fee policy
      const policy = await this.feeService.getCurrentPolicy();

      // Calculate transaction fee
      const transactionFee = orderData.total_usd * (policy.transaction_fee_percent / 100);
      const sellerNet = orderData.total_usd - transactionFee;

      // Create transaction record
      const transactionId = uuidv4();
      await client.query(
        `
        INSERT INTO transactions (
          id, order_id, gross_usd, fee_usd, net_usd, fx_rate, policy_version, trace_id,
          type, status, external_payment_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `,
        [
          transactionId,
          orderData.id,
          orderData.total_usd,
          transactionFee,
          sellerNet,
          orderData.fx_rate,
          policy.version,
          request.trace_id,
          "sale",
          "completed",
          request.payment_method_id
        ]
      );

      // Create ledger entries
      await this.createLedgerEntriesForTransaction(
        client,
        transactionId,
        orderData.total_usd,
        transactionFee,
        sellerNet,
        policy.version,
        request.trace_id
      );

      // Update order status
      const updatedOrder = await client.query(
        `
        UPDATE orders
        SET status = 'paid', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
        [request.order_id]
      );

      await client.query("COMMIT");
      return this.mapOrderRow(updatedOrder.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelOrder(orderId: string, buyerEmail: string): Promise<Order> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Get order and verify ownership
      const order = await client.query(
        `
        SELECT * FROM orders
        WHERE id = $1 AND buyer_email = $2 AND status = 'pending'
      `,
        [orderId, buyerEmail]
      );

      if (order.rows.length === 0) {
        throw new Error("Order not found or cannot be cancelled");
      }

      // Restore inventory
      const orderItems = await client.query(
        `
        SELECT product_id, quantity FROM order_items WHERE order_id = $1
      `,
        [orderId]
      );

      for (const item of orderItems.rows) {
        await client.query(
          `
          UPDATE products
          SET inventory_count = inventory_count + $1, updated_at = NOW()
          WHERE id = $2
        `,
          [item.quantity, item.product_id]
        );
      }

      // Update order status
      const result = await client.query(
        `
        UPDATE orders
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
        [orderId]
      );

      await client.query("COMMIT");
      return this.mapOrderRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: Order["status"],
    traceId: string
  ): Promise<Order> {
    const result = await this.pool.query(
      `
      UPDATE orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
      [status, orderId]
    );

    if (result.rows.length === 0) {
      throw new Error("Order not found");
    }

    return this.mapOrderRow(result.rows[0]);
  }

  private async createLedgerEntriesForTransaction(
    client: any,
    transactionId: string,
    grossUsd: number,
    feeUsd: number,
    sellerNet: number,
    policyVersion: string,
    traceId: string
  ): Promise<void> {
    // Get order items to determine sellers
    const orderItems = await client.query(
      `
      SELECT DISTINCT seller_id FROM order_items WHERE order_id IN (
        SELECT order_id FROM transactions WHERE id = $1
      )
    `,
      [transactionId]
    );

    // For each seller, create ledger entries
    for (const item of orderItems.rows) {
      const sellerId = item.seller_id;

      // Credit seller account (net amount)
      await client.query(
        `
        INSERT INTO ledger_entries (
          id, transaction_id, account_type, account_id, direction, amount_usd,
          balance_after_usd, policy_version, trace_id
        ) VALUES (
          gen_random_uuid(), $1, 'seller', $2, 'credit', $3,
          COALESCE((
            SELECT balance_after_usd FROM ledger_entries
            WHERE account_type = 'seller' AND account_id = $2
            ORDER BY created_at DESC LIMIT 1
          ), 0) + $3,
          $4, $5
        )
      `,
        [transactionId, sellerId, sellerNet, policyVersion, traceId]
      );
    }

    // Credit platform account (fee)
    await client.query(
      `
      INSERT INTO ledger_entries (
        id, transaction_id, account_type, direction, amount_usd,
        balance_after_usd, policy_version, trace_id
      ) VALUES (
        gen_random_uuid(), $1, 'platform', 'credit', $2,
        COALESCE((
          SELECT balance_after_usd FROM ledger_entries
          WHERE account_type = 'platform'
          ORDER BY created_at DESC LIMIT 1
        ), 0) + $2,
        $3, $4
      )
    `,
      [transactionId, feeUsd, policyVersion, traceId]
    );

    // Debit buyer account (gross)
    await client.query(
      `
      INSERT INTO ledger_entries (
        id, transaction_id, account_type, direction, amount_usd,
        balance_after_usd, policy_version, trace_id
      ) VALUES (
        gen_random_uuid(), $1, 'buyer', 'debit', $2,
        COALESCE((
          SELECT balance_after_usd FROM ledger_entries
          WHERE account_type = 'buyer'
          ORDER BY created_at DESC LIMIT 1
        ), 0) - $2,
        $3, $4
      )
    `,
      [transactionId, grossUsd, policyVersion, traceId]
    );
  }

  private mapOrderRow(row: any): Order {
    return {
      id: row.id,
      buyer_email: row.buyer_email,
      buyer_name: row.buyer_name,
      currency: row.currency,
      fx_rate: parseFloat(row.fx_rate),
      fx_timestamp: new Date(row.fx_timestamp),
      subtotal_usd: parseFloat(row.subtotal_usd),
      shipping_usd: parseFloat(row.shipping_usd),
      tax_usd: parseFloat(row.tax_usd),
      total_usd: parseFloat(row.total_usd),
      status: row.status,
      shipping_address: JSON.parse(row.shipping_address),
      billing_address: row.billing_address ? JSON.parse(row.billing_address) : undefined,
      trace_id: row.trace_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  private mapOrderItemRow(row: any): OrderItem {
    return {
      id: row.id,
      order_id: row.order_id,
      product_id: row.product_id,
      quantity: parseInt(row.quantity),
      unit_price_usd: parseFloat(row.unit_price_usd),
      total_price_usd: parseFloat(row.total_price_usd),
      seller_id: row.seller_id,
      created_at: new Date(row.created_at)
    };
  }
}
