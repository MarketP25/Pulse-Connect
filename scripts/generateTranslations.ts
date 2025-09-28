import fs from 'fs';
import path from 'path';
// import { LOCALE_REGION_MAPPING } from '../pulse-connect-core/src/config/lang'; // Uncomment when ready

const commonTranslations = {
  navigation: {
    home: 'Home',
    dashboard: 'Dashboard',
    profile: 'Profile',
    settings: 'Settings',
    login: 'Login',
    signup: 'Sign Up',
    logout: 'Logout',
  },
  actions: {
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    search: 'Search',
  },
  status: {
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    pending: 'Pending',
    completed: 'Completed',
  },
  payment: {
    currency: 'Currency',
    amount: 'Amount',
    pay: 'Pay Now',
    plan: 'Plan',
    subscription: 'Subscription',
    billing: 'Billing',
    creditCard: 'Credit Card',
    paypal: 'PayPal',
    bankTransfer: 'Bank Transfer',
    crypto: 'Cryptocurrency',
    localPayment: 'Local Payment Methods',
    recurringPayment: 'Recurring Payment',
    oneTimePayment: 'One-time Payment',
    freeTrialMessage: 'Start your free trial',
    currentPlan: 'Current Plan',
    upgradePlan: 'Upgrade Plan',
    cancelSubscription: 'Cancel Subscription',
    paymentMethods: 'Payment Methods',
    addPaymentMethod: 'Add Payment Method',
    billingHistory: 'Billing History',
    nextBillingDate: 'Next Billing Date',
    invoices: 'Invoices',
  },
  errors: {
    required: 'This field is required',
    invalid: 'Invalid input',
    networkError: 'Network error occurred',
    unauthorized: 'Unauthorized access',
    notFound: 'Not found',
    serverError: 'Server error occurred',
    paymentFailed: 'Payment failed',
    insufficientFunds: 'Insufficient funds',
    invalidCard: 'Invalid card details',
  },
  notifications: {
    success: 'Operation successful',
    error: 'An error occurred',
    info: 'Information',
    warning: 'Warning',
    newMessage: 'New message received',
    paymentSuccess: 'Payment successful',
    paymentFailed: 'Payment failed',
  },
  governance: {
    overrideRequired: 'Override required',
    emotionalFlagTriggered: 'Emotional flag triggered',
    accessDenied: 'Access denied: Upgrade required for financial flows',
    tradeExecuted: 'Trade executed',
    permissionDenied: 'Permission denied',
    councilReview: 'Council review required',
    feeCharged: 'Fee charged',
    refundIssued: 'Refund issued',
    basicTierLimitReached: 'Basic tier limit reached',
    upgradeRequired: 'Upgrade required to continue',
    auditLogged: 'Action logged for Council review',
  }
};

const messagesDir = path.join(process.cwd(), 'messages');
const i18nDir = path.join(process.cwd(), 'i18n');
const auditDir = path.join(process.cwd(), 'audit');
const langMapPath = path.join(i18nDir, 'lang-map.json');
const untranslatedLogPath = path.join(auditDir, 'untranslated-keys.json');

// Ensure directories exist
[messagesDir, i18nDir, auditDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Fallback locale mapping (replace with LOCALE_REGION_MAPPING when ready)
const fallbackLocales = ['en', 'sw', 'fr'];

fallbackLocales.forEach((locale) => {
  const localeDir = path.join(messagesDir, locale);

  try {
    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }

    const commonPath = path.join(localeDir, 'common.json');
    fs.writeFileSync(commonPath, JSON.stringify(commonTranslations, null, 2));

    // Write to lang-map.json
    const existingMap = fs.existsSync(langMapPath)
      ? JSON.parse(fs.readFileSync(langMapPath))
      : {};
    existingMap[locale] = commonTranslations;
    fs.writeFileSync(langMapPath, JSON.stringify(existingMap, null, 2));

    console.log(`✅ Generated translations for: ${locale}`);
  } catch (err) {
    console.error(`❌ Failed to generate translations for ${locale}:`, err);
  }
});

// Log missing keys for Council review
function logMissingKey(key: string, locale: string) {
  const existing = fs.existsSync(untranslatedLogPath)
    ? JSON.parse(fs.readFileSync(untranslatedLogPath))
    : [];
  existing.push({ key, locale, timestamp: new Date().toISOString() });
  fs.writeFileSync(untranslatedLogPath, JSON.stringify(existing, null, 2));
}

console.log('🎉 Translation templates generated successfully!');