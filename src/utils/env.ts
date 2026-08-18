/** True when running with full local permissions (no permission-group API). */
export const isLocalEnvironment = () =>
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'LOCAL';

/** True when permission groups should be loaded from the API after login. */
export const shouldFetchUserPermissions = (userId?: string | null) =>
  Boolean(userId) &&
  userId !== 'admin' &&
  !isLocalEnvironment();
