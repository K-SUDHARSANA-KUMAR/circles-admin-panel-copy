import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { toast } from 'sonner';

interface StoredUser {
  id?: string;
  userId?: string;
  email?: string;
  adminType?: string;
}

interface RefreshTokenResponse {
  data?: RefreshTokenResponse;
  accessToken?: string | null;
  idToken?: string | null;
  refreshToken?: string | null;
  tokens?: {
    accessToken?: string | null;
    idToken?: string | null;
    refreshToken?: string | null;
  };
}

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type QueueItem = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

const refreshAxios = axios.create();

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const isBrowser = () => typeof window !== 'undefined';

const getStoredUser = (): StoredUser | null => {
  if (!isBrowser()) return null;

  const userRaw = localStorage.getItem('user');
  if (!userRaw) return null;

  try {
    return JSON.parse(userRaw) as StoredUser;
  } catch (error) {
    console.warn('Failed to parse user data:', error);
    return null;
  }
};

const clearAuthStorage = () => {
  if (!isBrowser()) return;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('idToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
};

const logout = () => {
  clearAuthStorage();

  if (isBrowser() && window.location.pathname !== '/') {
    window.location.href = '/';
  }
};

const getRefreshUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_ADMIN_AUTH_REFRESH_URL;
  if (configuredUrl) return configuredUrl;

  const userServiceUrl =
    process.env.NEXT_PUBLIC_USER_SERVICE_URL ||
    'http://ec2-13-48-49-25.eu-north-1.compute.amazonaws.com/api/user-service';

  return `${userServiceUrl}/admin-auth/refresh-token`;
};

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
      return;
    }

    reject(error);
  });

  failedQueue = [];
};

const applyAuthHeaders = (config: InternalAxiosRequestConfig) => {
  const headers = AxiosHeaders.from(config.headers);
  
  // Set standard admin API key for all backend requests
  headers.set('X-Admin-Api-Key', 'local-admin-key-123');

  const accessToken = isBrowser() ? localStorage.getItem('accessToken') : null;
  const idToken = isBrowser() ? localStorage.getItem('idToken') : null;

  if (accessToken) {
    const authorizationHeader = headers.get('Authorization');

    headers.set('accessToken', accessToken);

    if (
      !authorizationHeader ||
      String(authorizationHeader).startsWith('Bearer ')
    ) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  if (idToken || accessToken) {
    headers.set('idToken', idToken || accessToken);
  }

  if (!headers.has('user-current-view')) {
    const user = getStoredUser();
    if (user?.adminType) {
      headers.set('user-current-view', user.adminType);
    }
  }

  config.headers = headers;
  return config;
};

const updateStoredTokens = (tokens: {
  accessToken: string;
  idToken?: string | null;
  refreshToken?: string | null;
}) => {
  if (!isBrowser()) return;

  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('idToken', tokens.idToken || tokens.accessToken);

  if (tokens.refreshToken) {
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }
};

const refreshToken = async () => {
  if (!isBrowser()) {
    throw new Error('Token refresh is only available in the browser.');
  }

  const refreshTokenValue = localStorage.getItem('refreshToken');
  const user = getStoredUser();

  if (!refreshTokenValue) {
    throw new Error('No refresh token available.');
  }

  const response = await refreshAxios.post<RefreshTokenResponse>(
    getRefreshUrl(),
    {
      refreshToken: refreshTokenValue,
      userId: user?.userId || user?.id,
      email: user?.email,
    },
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(user?.adminType ? { 'user-current-view': user.adminType } : {}),
      },
    }
  );

  const responseBody = response.data.data || response.data;
  const tokenSource = responseBody.tokens || responseBody;
  const newAccessToken = tokenSource.accessToken;

  if (!newAccessToken) {
    throw new Error('Refresh API did not return an access token.');
  }

  updateStoredTokens({
    accessToken: newAccessToken,
    idToken: tokenSource.idToken || newAccessToken,
    refreshToken: tokenSource.refreshToken || refreshTokenValue,
  });

  return newAccessToken;
};

const retryWithToken = (client: AxiosInstance, config: RetriableRequestConfig) =>
  new Promise<string>((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  }).then((token) => {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('accessToken', token);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;

    return client(config);
  });

const handleResponseError = async (
  client: AxiosInstance,
  error: AxiosError
) => {
  const originalRequest = error.config as RetriableRequestConfig | undefined;

  if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
    if (isRefreshing) {
      return retryWithToken(client, originalRequest);
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newAccessToken = await refreshToken();
      processQueue(null, newAccessToken);

      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set('accessToken', newAccessToken);
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      originalRequest.headers = headers;

      return client(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      toast.error('Session expired. Please login again.');
      logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }

  if (error.request) {
    console.error('Network error:', error.request);
  } else {
    console.error('Error:', error.message);
  }

  return Promise.reject(error);
};

export const attachAxiosInterceptors = (client: AxiosInstance) => {
  client.interceptors.request.use(
    (config) => applyAuthHeaders(config),
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => handleResponseError(client, error)
  );
};
