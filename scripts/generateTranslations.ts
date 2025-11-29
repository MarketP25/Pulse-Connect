import fs from "fs";
import path from "path";
import { LOCALE_REGION_MAPPING } from "../src/config/lang"; // ✅ Adjust path if needed

const commonTranslations = {
  navigation: {
    home: "Home",
    dashboard: "Dashboard",
    profile: "Profile",
    settings: "Settings",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
  },
  actions: {
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    submit: "Submit",
    search: "Search",
  },
  status: {
    loading: "Loading...",
    success: "Success",
    error: "Error",
    pending: "Pending",
    completed: "Completed",
  },
  payment: {
    currency: "Currency",
    amount: "Amount",
    pay: "Pay Now",
    plan: "Plan",
    subscription: "Subscription",
    billing: "Billing",
    creditCard: "Credit Card",
    paypal: "PayPal",
    bankTransfer: "Bank Transfer",
    crypto: "Cryptocurrency",
    localPayment: "Local Payment Methods",
    recurringPayment: "Recurring Payment",
    oneTimePayment: "One-time Payment",
    freeTrialMessage: "Start your free trial",
    currentPlan: "Current Plan",
    upgradePlan: "Upgrade Plan",
    cancelSubscription: "Cancel Subscription",
    paymentMethods: "Payment Methods",
    addPaymentMethod: "Add Payment Method",
    billingHistory: "Billing History",
    nextBillingDate: "Next Billing Date",
    invoices: "Invoices",
  },
  errors: {
    required: "This field is required",
    invalid: "Invalid input",
    networkError: "Network error occurred",
    unauthorized: "Unauthorized access",
    notFound: "Not found",
    serverError: "Server error occurred",
    paymentFailed: "Payment failed",
    insufficientFunds: "Insufficient funds",
    invalidCard: "Invalid card details",
  },
  notifications: {
    success: "Operation successful",
    error: "An error occurred",
    info: "Information",
    warning: "Warning",
    newMessage: "New message received",
    paymentSuccess: "Payment successful",
    paymentFailed: "Payment failed",
  },
};

const messagesDir = path.join(process.cwd(), "messages");

// Ensure messages directory exists
if (!fs.existsSync(messagesDir)) {
  fs.mkdirSync(messagesDir, { recursive: true });
}

Object.keys(LOCALE_REGION_MAPPING).forEach((localeKey) => {
  const locale = String(localeKey); // ✅ Avoid symbol conversion errors
  const localeDir = path.join(messagesDir, locale);

  try {
    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }

    const commonPath = path.join(localeDir, "common.json");
    fs.writeFileSync(commonPath, JSON.stringify(commonTranslations, null, 2));

    console.log(`✅ Generated translations for: ${locale}`);
  } catch (err) {
    console.error(`❌ Failed to generate translations for ${locale}:`, err);
  }
});

console.log("🎉 Translation templates generated successfully!");
