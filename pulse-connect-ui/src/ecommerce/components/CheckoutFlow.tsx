import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

interface CartItem {
  product_id: string;
  title: string;
  price_usd: number;
  quantity: number;
  seller_id: string;
  seller_name: string;
  image_url?: string;
}

interface ShippingAddress {
  first_name: string;
  last_name: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface CheckoutData {
  buyer_email: string;
  currency: string;
  shipping_address: ShippingAddress;
  billing_address?: ShippingAddress;
  items: CartItem[];
}

interface OrderSummary {
  subtotal_usd: number;
  shipping_usd: number;
  tax_usd: number;
  total_usd: number;
  fx_rate: number;
  fx_timestamp: string;
  policy_version: string;
  trace_id: string;
}

interface CheckoutFlowProps {
  cartItems: CartItem[];
  onOrderComplete: (orderId: string) => void;
  onCancel: () => void;
}

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({
  cartItems,
  onOrderComplete,
  onCancel
}) => {
  const [step, setStep] = useState<"shipping" | "review" | "payment">("shipping");
  const [checkoutData, setCheckoutData] = useState<Partial<CheckoutData>>({
    currency: "USD",
    items: cartItems
  });
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price_usd * item.quantity, 0);

  const handleShippingSubmit = (shippingData: Omit<CheckoutData, "items">) => {
    setCheckoutData({ ...checkoutData, ...shippingData });
    setStep("review");
  };

  const handleReviewSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create order and get summary
      const traceId = uuidv4();
      const response = await fetch("/api/ecommerce/orders/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...checkoutData,
          trace_id: traceId
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create order preview");
      }

      const summary = await response.json();
      setOrderSummary(summary);
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process order");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (paymentMethodId: string) => {
    if (!orderSummary) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ecommerce/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...checkoutData,
          payment_method_id: paymentMethodId,
          trace_id: orderSummary.trace_id
        })
      });

      if (!response.ok) {
        throw new Error("Payment failed");
      }

      const result = await response.json();
      onOrderComplete(result.order_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === "shipping") {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Shipping Information</h2>

        <ShippingForm
          onSubmit={handleShippingSubmit}
          onCancel={onCancel}
          initialData={checkoutData}
        />

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Review Your Order</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <OrderReview checkoutData={checkoutData as CheckoutData} cartItems={cartItems} />
          </div>

          <div>
            <OrderSummaryDisplay cartItems={cartItems} subtotal={subtotal} />
          </div>
        </div>

        <div className="mt-8 flex space-x-4">
          <button
            onClick={() => setStep("shipping")}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            disabled={loading}
          >
            Back
          </button>
          <button
            onClick={handleReviewSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Processing..." : "Continue to Payment"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  }

  if (step === "payment" && orderSummary) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Complete Payment</h2>

        <PaymentForm
          orderSummary={orderSummary}
          onPayment={handlePayment}
          onCancel={() => setStep("review")}
          loading={loading}
        />

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return null;
};

interface ShippingFormProps {
  onSubmit: (data: Omit<CheckoutData, "items">) => void;
  onCancel: () => void;
  initialData: Partial<CheckoutData>;
}

const ShippingForm: React.FC<ShippingFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    buyer_email: initialData.buyer_email || "",
    currency: initialData.currency || "USD",
    shipping_address: initialData.shipping_address || {
      first_name: "",
      last_name: "",
      street: "",
      city: "",
      state: "",
      postal_code: "",
      country: ""
    },
    billing_address: initialData.billing_address
  });

  const [sameAsShipping, setSameAsShipping] = useState(!initialData.billing_address);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const billingAddress = sameAsShipping ? formData.shipping_address : formData.billing_address;
    onSubmit({
      ...formData,
      billing_address: billingAddress
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Email Address</label>
        <input
          type="email"
          required
          className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          value={formData.buyer_email}
          onChange={(e) => setFormData({ ...formData, buyer_email: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Currency</label>
        <select
          className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          value={formData.currency}
          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
        >
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
          <option value="KES">KES - Kenyan Shilling</option>
        </select>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4">Shipping Address</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">First Name</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              value={formData.shipping_address.first_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shipping_address: { ...formData.shipping_address, first_name: e.target.value }
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Last Name</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              value={formData.shipping_address.last_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shipping_address: { ...formData.shipping_address, last_name: e.target.value }
                })
              }
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Street Address</label>
          <input
            type="text"
            required
            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            value={formData.shipping_address.street}
            onChange={(e) =>
              setFormData({
                ...formData,
                shipping_address: { ...formData.shipping_address, street: e.target.value }
              })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              value={formData.shipping_address.city}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shipping_address: { ...formData.shipping_address, city: e.target.value }
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">State/Province</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              value={formData.shipping_address.state}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shipping_address: { ...formData.shipping_address, state: e.target.value }
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">Postal Code</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              value={formData.shipping_address.postal_code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shipping_address: { ...formData.shipping_address, postal_code: e.target.value }
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Country</label>
            <select
              required
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              value={formData.shipping_address.country}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shipping_address: { ...formData.shipping_address, country: e.target.value }
                })
              }
            >
              <option value="">Select Country</option>
              <option value="US">United States</option>
              <option value="KE">Kenya</option>
              <option value="GB">United Kingdom</option>
              <option value="DE">Germany</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="sameAsShipping"
            checked={sameAsShipping}
            onChange={(e) => setSameAsShipping(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="sameAsShipping" className="ml-2 text-sm text-gray-700">
            Billing address is the same as shipping address
          </label>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Continue to Review
        </button>
      </div>
    </form>
  );
};

interface OrderReviewProps {
  checkoutData: CheckoutData;
  cartItems: CartItem[];
}

const OrderReview: React.FC<OrderReviewProps> = ({ checkoutData, cartItems }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Shipping Address</h3>
        <div className="bg-gray-50 p-4 rounded">
          <p className="font-medium">
            {checkoutData.shipping_address.first_name} {checkoutData.shipping_address.last_name}
          </p>
          <p>{checkoutData.shipping_address.street}</p>
          <p>
            {checkoutData.shipping_address.city}, {checkoutData.shipping_address.state}{" "}
            {checkoutData.shipping_address.postal_code}
          </p>
          <p>{checkoutData.shipping_address.country}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Items</h3>
        <div className="space-y-3">
          {cartItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-gray-600">Seller: {item.seller_name}</p>
                <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
              </div>
              <p className="font-medium">${(item.price_usd * item.quantity).toFixed(2)} USD</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <h4 className="font-medium text-yellow-800 mb-2">Important Notes</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Sellers are responsible for shipping costs and delivery</li>
          <li>• Sellers handle all applicable taxes and duties</li>
          <li>• Platform displays seller-provided shipping and tax information only</li>
          <li>• All prices shown in USD as the canonical currency</li>
        </ul>
      </div>
    </div>
  );
};

interface OrderSummaryDisplayProps {
  cartItems: CartItem[];
  subtotal: number;
}

const OrderSummaryDisplay: React.FC<OrderSummaryDisplayProps> = ({ cartItems, subtotal }) => {
  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h3 className="text-lg font-medium mb-4">Order Summary</h3>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span>Items ({cartItems.length})</span>
          <span>${subtotal.toFixed(2)} USD</span>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Shipping</span>
          <span>Calculated by seller</span>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Tax</span>
          <span>Calculated by seller</span>
        </div>

        <hr className="my-3" />

        <div className="flex justify-between font-medium text-lg">
          <span>Total</span>
          <span>${subtotal.toFixed(2)} USD</span>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>* Final shipping and tax costs will be provided by sellers</p>
        <p>* All transactions processed in USD</p>
      </div>
    </div>
  );
};

interface PaymentFormProps {
  orderSummary: OrderSummary;
  onPayment: (paymentMethodId: string) => void;
  onCancel: () => void;
  loading: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  orderSummary,
  onPayment,
  onCancel,
  loading
}) => {
  const [paymentMethodId, setPaymentMethodId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethodId) {
      onPayment(paymentMethodId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded">
        <h3 className="font-medium mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${orderSummary.subtotal_usd.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping:</span>
            <span>${orderSummary.shipping_usd.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>${orderSummary.tax_usd.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total:</span>
            <span>${orderSummary.total_usd.toFixed(2)} USD</span>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          <p>
            FX Rate: {orderSummary.fx_rate} (as of{" "}
            {new Date(orderSummary.fx_timestamp).toLocaleString()})
          </p>
          <p>Policy Version: {orderSummary.policy_version}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Payment Method</label>
          <select
            required
            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
          >
            <option value="">Select Payment Method</option>
            <option value="card_visa">Visa **** 4242</option>
            <option value="card_mastercard">Mastercard **** 8888</option>
            <option value="paypal">PayPal</option>
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h4 className="font-medium text-blue-900 mb-2">Transaction Fee</h4>
          <p className="text-sm text-blue-800">
            A 7% transaction fee will be applied to this order as per platform policy. This fee
            supports platform operations and seller payouts.
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            disabled={loading}
          >
            Back
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            disabled={loading || !paymentMethodId}
          >
            {loading ? "Processing..." : `Pay $${orderSummary.total_usd.toFixed(2)} USD`}
          </button>
        </div>
      </form>
    </div>
  );
};
