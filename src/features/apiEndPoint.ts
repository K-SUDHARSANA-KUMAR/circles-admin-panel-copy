const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  'http://ec2-13-48-49-25.eu-north-1.compute.amazonaws.com/api';

export const apiEndPoint = Object.freeze({
  //Dashboard

  
  // NOTIFICATIONS_ENDPOINT: (process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL) + '/notifications',
  NOTIFICATIONS_COUNT_ENDPOINT: (process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL) + '/notifications/count',


  //Circle-Services

  //Users Services
  USERS_ENDPOINT: `${baseUrl}/user-service/users`,
  INTERESTS_ENDPOINT: `${baseUrl}/user-service/interests`,
  INTEREST_GROUPS_ENDPOINT: `${baseUrl}/user-service/interest-groups`,
  CITIES_ENDPOINT: `${baseUrl}/user-service/cities`,
  COUNTRIES_ENDPOINT: `${baseUrl}/user-service/countries`,
  ZING_ENDPOINT: `${baseUrl}/user-service/zing/sync-employees`,
  PERMISSIONS_ENDPOINT: `${baseUrl}/user-service/permissions`,
  PERMISSION_GROUPS_ENDPOINT: `${baseUrl}/user-service/permissiongroup`,
});
