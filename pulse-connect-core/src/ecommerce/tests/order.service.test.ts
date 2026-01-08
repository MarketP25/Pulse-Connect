import { Pool } from "pg";
import { OrderService, CreateOrderRequest, OrderPaymentRequest } from "../services/order.service";
import { FeeService } from "../services/fee.service";

// Mock the database pool
jest.mock("pg", () => {
  const mockPool = {
    connect: jest.fn(),
    query: jest.fn()
  };
  return { Pool: jest.fn(() => mockPool) };
});

// Mock the FeeService
jest.mock("../services/fee.service", () => {
  return {
    FeeService: jest.fn().mockImplementation(() => ({
      getCurrentPolicy: jest.fn().mockResolvedValue({
        version: "v1.0.0",
        transaction_fee_percent: 7
      })
    }))
  };
});

describe("OrderService", () => {
  let orderService: OrderService;
  let mockPool: any;
  let mockFeeService: any;

  beforeEach(() => {
    mockPool = new Pool();
    mockFeeService = new FeeService(mockPool);
    orderService = new OrderService(mockPool, mockFeeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createOrder", () => {
    it("should create an order successfully", async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock product validation query
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: "prod1",
              price_usd: 100,
              inventory_count: 10,
              seller_id: "seller1",
              is_active: true
            }
          ]
        })
        // Mock order creation
        .mockResolvedValueOnce({
          rows: [{ id: "order1", buyer_email: "test@example.com", status: "pending" }]
        })
        // Mock order item creation
        .mockResolvedValueOnce({})
        // Mock inventory update
        .mockResolvedValueOnce({})
        // Mock transaction commit
        .mockResolvedValueOnce({});

      const request: CreateOrderRequest = {
        buyer_email: "test@example.com",
        currency: "USD",
        items: [{ product_id: "prod1", quantity: 1 }],
        shipping_address: {
          first_name: "John",
          last_name: "Doe",
          street: "123 Main St",
          city: "Anytown",
          state: "CA",
          postal_code: "12345",
          country: "US"
        },
        trace_id: "trace123"
      };

      const result = await orderService.createOrder(request);

      expect(result).toBeDefined();
      expect(result.id).toBe("order1");
      expect(result.buyer_email).toBe("test@example.com");
      expect(result.status).toBe("pending");
      expect(mockClient.query).toHaveBeenCalledTimes(6); // BEGIN, product check, order insert, item insert, inventory update, COMMIT
    });

    it("should throw error for non-existent product", async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock empty product results
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const request: CreateOrderRequest = {
        buyer_email: "test@example.com",
        currency: "USD",
        items: [{ product_id: "nonexistent", quantity: 1 }],
        shipping_address: {
          first_name: "John",
          last_name: "Doe",
          street: "123 Main St",
          city: "Anytown",
          state: "CA",
          postal_code: "12345",
          country: "US"
        },
        trace_id: "trace123"
      };

      await expect(orderService.createOrder(request)).rejects.toThrow(
        "One or more products not found or inactive"
      );
    });

    it("should throw error for insufficient inventory", async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock product with insufficient inventory
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { id: "prod1", price_usd: 100, inventory_count: 0, seller_id: "seller1", is_active: true }
        ]
      });

      const request: CreateOrderRequest = {
        buyer_email: "test@example.com",
        currency: "USD",
        items: [{ product_id: "prod1", quantity: 1 }],
        shipping_address: {
          first_name: "John",
          last_name: "Doe",
          street: "123 Main St",
          city: "Anytown",
          state: "CA",
          postal_code: "12345",
          country: "US"
        },
        trace_id: "trace123"
      };

      await expect(orderService.createOrder(request)).rejects.toThrow(
        "Insufficient inventory for product prod1"
      );
    });

    it("should rollback transaction on error", async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock product validation
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: "prod1",
              price_usd: 100,
              inventory_count: 10,
              seller_id: "seller1",
              is_active: true
            }
          ]
        })
        // Mock order creation failure
        .mockRejectedValueOnce(new Error("Database error"))
        // Mock rollback
        .mockResolvedValueOnce({});

      const request: CreateOrderRequest = {
        buyer_email: "test@example.com",
        currency: "USD",
        items: [{ product_id: "prod1", quantity: 1 }],
        shipping_address: {
          first_name: "John",
          last_name: "Doe",
          street: "123 Main St",
          city: "Anytown",
          state: "CA",
          postal_code: "12345",
          country: "US"
        },
        trace_id: "trace123"
      };

      await expect(orderService.createOrder(request)).rejects.toThrow("Database error");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    });
  });

  describe("getOrder", () => {
    it("should return order when found", async () => {
      const mockOrderRow = {
        id: "order1",
        buyer_email: "test@example.com",
        currency: "USD",
        fx_rate: "1.0",
        fx_timestamp: "2025-01-01T00:00:00Z",
        subtotal_usd: "100.00",
        shipping_usd: "10.00",
        tax_usd: "8.00",
        total_usd: "118.00",
        status: "pending",
        shipping_address: '{"first_name":"John","last_name":"Doe"}',
        billing_address: null,
        trace_id: "trace123",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z"
      };

      mockPool.query.mockResolvedValue({ rows: [mockOrderRow] });

      const result = await orderService.getOrder("order1");

      expect(result).toBeDefined();
      expect(result!.id).toBe("order1");
      expect(result!.buyer_email).toBe("test@example.com");
      expect(result!.fx_rate).toBe(1.0);
    });

    it("should return null when order not found", async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await orderService.getOrder("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getOrderItems", () => {
    it("should return order items", async () => {
      const mockItems = [
        {
          id: "item1",
          order_id: "order1",
          product_id: "prod1",
          quantity: "2",
          unit_price_usd: "50.00",
          total_price_usd: "100.00",
          seller_id: "seller1",
          created_at: "2025-01-01T00:00:00Z"
        }
      ];

      mockPool.query.mockResolvedValue({ rows: mockItems });

      const result = await orderService.getOrderItems("order1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("item1");
      expect(result[0].quantity).toBe(2);
      expect(result[0].unit_price_usd).toBe(50);
    });
  });

  describe("processPayment", () => {
    it("should process payment successfully", async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock order retrieval
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: "order1",
              buyer_email: "test@example.com",
              currency: "USD",
              fx_rate: "1.0",
              fx_timestamp: "2025-01-01T00:00:00Z",
              subtotal_usd: "100.00",
              shipping_usd: "10.00",
              tax_usd: "8.00",
              total_usd: "118.00",
              status: "pending",
              shipping_address: '{"first_name":"John","last_name":"Doe"}',
              billing_address: null,
              trace_id: "trace123",
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z"
            }
          ]
        })
        // Mock transaction creation
        .mockResolvedValueOnce({ rows: [{ id: "txn1" }] })
        // Mock ledger entries creation
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        // Mock order status update
        .mockResolvedValueOnce({
          rows: [
            {
              id: "order1",
              status: "paid"
            }
          ]
        });

      const request: OrderPaymentRequest = {
        order_id: "order1",
        payment_method_id: "pm_card_visa",
        trace_id: "trace456"
      };

      const result = await orderService.processPayment(request);

      expect(result).toBeDefined();
      expect(result.status).toBe("paid");
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
    });

    it("should throw error for non-existent order", async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock empty order results
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const request: OrderPaymentRequest = {
        order_id: "nonexistent",
        payment_method_id: "pm_card_visa",
        trace_id: "trace456"
      };

      await expect(orderService.processPayment(request)).rejects.toThrow(
        "Order not found or not payable"
      );
    });

    it("should rollback on payment processing error", async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock order retrieval
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: "order1",
              buyer_email: "test@example.com",
              currency: "USD",
              fx_rate: "1.0",
              fx_timestamp: "2025-01-01T00:00:00Z",
              subtotal_usd: "100.00",
              shipping_usd: "10.00",
              tax_usd: "8.00",
              total_usd: "118.00",
              status: "pending",
              shipping_address: '{"first_name":"John","last_name":"Doe"}',
              billing_address: null,
              trace_id: "trace123",
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z"
            }
          ]
        })
        // Mock transaction creation failure
        .mockRejectedValueOnce(new Error("Payment processing failed"))
        // Mock rollback
        .mockResolvedValueOnce({});

      const request: OrderPaymentRequest = {
        order_id: "order1",
        payment_method_id: "pm_card_visa",
        trace_id: "trace456"
      };

      await expect(orderService.processPayment(request)).rejects.toThrow(
        "Payment processing failed"
      );
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel order and restore inventory", async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock order retrieval
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: "order1",
              buyer_email: "test@example.com",
              status: "pending"
            }
          ]
        })
        // Mock order items retrieval
        .mockResolvedValueOnce({
          rows: [{ product_id: "prod1", quantity: 2 }]
        })
        // Mock inventory restoration
        .mockResolvedValueOnce({})
        // Mock order status update
        .mockResolvedValueOnce({
          rows: [
            {
              id: "order1",
              status: "cancelled"
            }
          ]
        });

      const result = await orderService.cancelOrder("order1", "test@example.com");

      expect(result).toBeDefined();
      expect(result.status).toBe("cancelled");
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
    });

    it("should throw error for non-owned order", async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock empty order results (wrong email)
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(orderService.cancelOrder("order1", "wrong@example.com")).rejects.toThrow(
        "Order not found or cannot be cancelled"
      );
    });
  });

  describe("updateOrderStatus", () => {
    it("should update order status", async () => {
      const mockOrderRow = {
        id: "order1",
        buyer_email: "test@example.com",
        currency: "USD",
        fx_rate: "1.0",
        fx_timestamp: "2025-01-01T00:00:00Z",
        subtotal_usd: "100.00",
        shipping_usd: "10.00",
        tax_usd: "8.00",
        total_usd: "118.00",
        status: "shipped",
        shipping_address: '{"first_name":"John","last_name":"Doe"}',
        billing_address: null,
        trace_id: "trace123",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z"
      };

      mockPool.query.mockResolvedValue({ rows: [mockOrderRow] });

      const result = await orderService.updateOrderStatus("order1", "shipped", "trace789");

      expect(result).toBeDefined();
      expect(result.status).toBe("shipped");
    });

    it("should throw error for non-existent order", async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        orderService.updateOrderStatus("nonexistent", "shipped", "trace789")
      ).rejects.toThrow("Order not found");
    });
  });
});
