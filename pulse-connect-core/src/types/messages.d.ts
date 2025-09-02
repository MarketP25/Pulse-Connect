declare interface IntlMessages {
  common: {
    featureGate: {
      noPermission: string;
      upgradeRequired: string;
    };
    auth: {
      roles: {
        USER: string;
        HOST: string;
        ADMIN: string;
        SUPER_ADMIN: string;
      };
      permissions: {
        listings: string;
        bookings: string;
        payments: string;
        users: string;
        settings: string;
        analytics: string;
        admin: string;
      };
    };
  };
  plans: {
    title: string;
    description: string;
  };
}
