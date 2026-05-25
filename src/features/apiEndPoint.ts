export const apiEndPoint = Object.freeze({
  // Auth
  AUTH_BASE_URL: process.env.NEXT_PUBLIC_IAM_SERVICE_URL,

  //Common
  FILE_SERVICE_URL:
    process.env.NEXT_PUBLIC_FILE_SERVICE_URL,

  //Config Management
  APPROVAL_HIERARCHY_ENDPOINT:
    process.env.NEXT_PUBLIC_CONFIG_SERVICE_URL + '/hierarchy',
  CLAIM_APPROVAL_HIERARCHY_ENDPOINT:
    process.env.NEXT_PUBLIC_CONFIG_SERVICE_URL + '/claimhierarchy',
  CONFIGURATIONS_ENDPOINT:
    process.env.NEXT_PUBLIC_CONFIG_SERVICE_URL + '/configurations',
  FORMS_ENDPOINT:
    process.env.NEXT_PUBLIC_ACTIVITY_SERVICE_URL + '/activity-schema',
  CONFIG_BASE_URL: process.env.NEXT_PUBLIC_CONFIG_SERVICE_URL || '',
  PJP_CONFIG_INSIGHTS_ENDPOINT:
    (process.env.NEXT_PUBLIC_CONFIG_SERVICE_URL || '') + '/pjp-config/insights',

  //Dashboard
  ATTENDANCE_ENDPOINT: process.env.NEXT_PUBLIC_USER_SERVICE_URL || '',
  CLAIM_ENDPOINT: process.env.NEXT_PUBLIC_CLAIM_SERVICE_URL + '/claims',
  ORDERS_ENDPOINT: process.env.NEXT_PUBLIC_ORDER_SERVICE_URL || '',
  OUTLETS_ENDPOINT: process.env.NEXT_PUBLIC_PARTNER_SERVICE_URL + '/outlets',
  // NOTIFICATIONS_ENDPOINT: (process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL) + '/notifications',
  NOTIFICATIONS_COUNT_ENDPOINT: (process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL) + '/notifications/count',
  ROUTE_PLAN_BASE_URL: process.env.NEXT_PUBLIC_ROUTE_SERVICE_URL || '',
  REPORT_SERVICE_URL: process.env.NEXT_PUBLIC_REPORT_SERVICE_URL || '',
  PRICING_GROUPS_ENDPOINT:
    process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL + '/pricing-groups',
  PRICING_GROUP_PRODUCTS_ENDPOINT:
    process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL + '/pricing-group-products',
  PRODUCTS_ENDPOINT: process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL + '/products',
  STOCKAUDIT_ENDPOINT:
    process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL + '/stock-audit',
  SCHEMES_ENDPOINT: process.env.NEXT_PUBLIC_DISCOUNT_SERVICE_URL + '/schemes',
  SCHEMES_CALCULATE_REWARD_ENDPOINT: process.env.NEXT_PUBLIC_DISCOUNT_SERVICE_URL + '/reward-calculation',

  //Logs
  BASE_URL: (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  LOGS_PARTNER_ENDPOINT: process.env.NEXT_PUBLIC_PARTNER_SERVICE_URL + '/audit-logs/logs',
  LOGS_USER_ENDPOINT: process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/audit-logs/logs',
  LOGS_MDM_ENDPOINT: process.env.NEXT_PUBLIC_MDM_SERVICE_URL + '/audit-logs/logs',

  //Master Management
  MASTER_RECORDS_ENDPOINT: process.env.NEXT_PUBLIC_MDM_SERVICE_URL + '/master',
  GROUPS_ENDPOINT: process.env.NEXT_PUBLIC_MDM_SERVICE_URL + '/groups',
  MASTER_SCHEMA_ENDPOINT: process.env.NEXT_PUBLIC_MDM_SERVICE_URL + '/schema',

  //Users Manegement
  USERS_ENDPOINT: process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/users',
  INTERESTS_ENDPOINT:
    process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/interests',
  INTEREST_GROUPS_ENDPOINT:
    process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/interest-groups',
  CITIES_ENDPOINT:
    (process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://ec2-13-48-49-25.eu-north-1.compute.amazonaws.com/api/user-service') + '/cities',
  ZING_ENDPOINT:
    process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/zing/sync-employees',
  PERMISSIONS_ENDPOINT:
    process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/permissions',
  PERMISSION_GROUPS_ENDPOINT:
    process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/permissiongroup',

  //Warehouse Management
  PINCODE_ENDPOINT:
    process.env.NEXT_PUBLIC_MDM_SERVICE_URL + '/master/pincode/data',
  PINCODE_PARTNER_ENDPOINT: process.env.NEXT_PUBLIC_PARTNER_SERVICE_URL,
  WAREHOUSE_ENDPOINT:
    process.env.NEXT_PUBLIC_PARTNER_SERVICE_URL + '/warehouse',

  //Map Services
  MAP_PROVIDERS_ENDPOINT: process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/map-providers',

  //Payment Service
  PAYMENT_SERVICE_URL: process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL,

  //Sync Service
  SYNC_SERVICE_URL: process.env.NEXT_PUBLIC_SYNC_SERVICE_URL,
});
