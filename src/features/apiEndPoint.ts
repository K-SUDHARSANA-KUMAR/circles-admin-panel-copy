export const apiEndPoint = Object.freeze({
  //Dashboard

  
  // NOTIFICATIONS_ENDPOINT: (process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL) + '/notifications',
  NOTIFICATIONS_COUNT_ENDPOINT: (process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL) + '/notifications/count',


  //Circle-Services

  //Users Services
  USERS_ENDPOINT: process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/user-service/users',
  INTERESTS_ENDPOINT:
    process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/user-service/interests',
  INTEREST_GROUPS_ENDPOINT:
    process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/user-service/interest-groups',
  CITIES_ENDPOINT:
    process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/user-service/cities',
  ZING_ENDPOINT:
    process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/user-service/zing/sync-employees',
  PERMISSIONS_ENDPOINT:
    process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/user-service/permissions',
  PERMISSION_GROUPS_ENDPOINT:
    process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/user-service/permissiongroup'
});
