// components/PurchaseCredits.tsx
// [CLEANED] Removed redundant React import

export const PurchaseCredits: React.FC = () => {
  const handlePurchase = (gateway: "mpesa" | "stripe" | "paystack") => {
    // Redirect to payment gateway with metadata
    window.location.href = `/api/pay/${gateway}?amount=300&credits=10`;
  };

  return (
    <div>
      <h3>Buy Pulse Credits</h3>
      <button onClick={() => handlePurchase("mpesa")}>Buy with M-Pesa</button>
      <button onClick={() => handlePurchase("paystack")}>Buy with Paystack</button>
      <button onClick={() => handlePurchase("stripe")}>Buy with Stripe</button>
    </div>
  );
};
