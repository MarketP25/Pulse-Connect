export const BASE_PATH_BY_APP = {
  'pulsco': '/',
  'apps/pulse-portal': '/',
  'pulse-connect-ui': '/connect',
  'pulse-connect-admin-ui': '/admin',
  'pulse-connect-admin-ui/apps/business-ops-dashboard': '/admin/business-ops',
  'pulse-connect-admin-ui/apps/commercial-dashboard': '/admin/commercial',
  'pulse-connect-admin-ui/apps/coo-dashboard': '/admin/coo',
  'pulse-connect-admin-ui/apps/customer-experience-dashboard': '/admin/customer-experience',
  'pulse-connect-admin-ui/apps/governance-registrar-dashboard': '/admin/governance-registrar',
  'pulse-connect-admin-ui/apps/legal-finance-dashboard': '/admin/legal-finance',
  'pulse-connect-admin-ui/apps/people-risk-dashboard': '/admin/people-risk',
  'pulse-connect-admin-ui/apps/procurement-dashboard': '/admin/procurement',
  'pulse-connect-admin-ui/apps/superadmin-dashboard': '/admin/superadmin',
  'pulse-connect-admin-ui/apps/tech-security-dashboard': '/admin/tech-security',
}

export const CRITICAL_LOCAL_ENDPOINTS = [
  'pulse-connect-ui/src/pages/api/payments/checkout.ts',
  'pulse-connect-ui/src/pages/api/mpesa/push.ts',
  'pulse-connect-ui/src/pages/api/paystack/initialize.ts',
  'pulse-connect-ui/src/pages/api/wallet/fund.ts',
  'pulse-connect-ui/src/pages/api/wallet/balance.ts',
  'pulse-connect-ui/src/pages/api/products/index.ts',
  'pulse-connect-ui/src/pages/api/plans/purchase.ts',
]

export const CRITICAL_ENDPOINT_GUARD_MARKER = 'assertCriticalActionAllowed'

export const EDGE_EXECUTE_PROXY_ROUTES = [
  'apps/pulse-portal/src/app/api/edge/execute/route.ts',
  'pulse-connect-ui/src/app/api/edge/execute/route.ts',
  'pulse-connect-admin-ui/src/app/api/edge/execute/route.ts',
  'pulse-connect-admin-ui/apps/business-ops-dashboard/src/app/api/edge/execute/route.ts',
  'pulse-connect-admin-ui/apps/commercial-dashboard/src/app/api/edge/execute/route.ts',
  'pulse-connect-admin-ui/apps/coo-dashboard/src/app/api/edge/execute/route.ts',
  'pulse-connect-admin-ui/apps/customer-experience-dashboard/src/app/api/edge/execute/route.ts',
  'pulse-connect-admin-ui/apps/governance-registrar-dashboard/src/app/api/edge/execute/route.ts',
  'pulse-connect-admin-ui/apps/legal-finance-dashboard/src/app/api/edge/execute/route.ts',
  'pulse-connect-admin-ui/apps/people-risk-dashboard/src/app/api/edge/execute/route.ts',
  'pulse-connect-admin-ui/apps/procurement-dashboard/src/app/api/edge/execute/route.ts',
  'pulse-connect-admin-ui/apps/superadmin-dashboard/src/app/api/edge/execute/route.ts',
  'pulse-connect-admin-ui/apps/tech-security-dashboard/src/app/api/edge/execute/route.ts',
]

export const REQUIRED_CANONICAL_ICONS = [
  'apps/pulse-portal/public/icons/icon-16x16.png',
  'apps/pulse-portal/public/icons/icon-32x32.png',
  'apps/pulse-portal/public/icons/favicon.ico',
  'apps/pulse-portal/public/icons/icon-152x152.jpeg',
  'apps/pulse-portal/public/icons/icon-192x192.jpeg',
  'apps/pulse-portal/public/icons/icon-512x512.jpeg',
  'apps/pulse-portal/public/icons/icon-152x152-maskable.jpeg',
  'apps/pulse-portal/public/icons/icon-512x512-maskable.jpeg',
  'apps/pulse-portal/public/icons/brand-1024x1024.jpeg',
]

export const UNIFIED_ORIGIN_FILES = [
  'infra/gateway/nginx/pulsco-unified-origin.conf',
  'infra/k8s/pulsco-unified-origin-ingress.yaml',
]

export const UNIFIED_ORIGIN_REQUIRED_PATHS = [
  '/',
  '/connect',
  '/admin',
  '/billing',
  '/wallet',
  '/auth',
  '/edge',
  '/marp',
]

export const UNIFIED_ORIGIN_REQUIRED_SERVICE_NAMES = [
  'edge-gateway-service',
  'marp-firewall-gateway-service',
  'pulse-portal-service',
  'pulse-connect-ui-service',
  'pulse-connect-admin-ui-service',
  'business-ops-dashboard-service',
  'commercial-dashboard-service',
  'coo-dashboard-service',
  'customer-experience-dashboard-service',
  'governance-registrar-dashboard-service',
  'legal-finance-dashboard-service',
  'people-risk-dashboard-service',
  'procurement-dashboard-service',
  'superadmin-dashboard-service',
  'tech-security-dashboard-service',
  'dpo-dashboard-service',
]

