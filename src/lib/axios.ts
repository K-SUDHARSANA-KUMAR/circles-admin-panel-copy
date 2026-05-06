import axios from 'axios';
import { toast } from 'sonner';

const customAxios = axios.create();

// REQUEST INTERCEPTOR
customAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.accessToken = token;
    }

    // Add user-current-view header with adminType from user details if available
    // Only set if not already provided in the request config
    if (typeof window !== 'undefined' && !config.headers['user-current-view']) {
      try {
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          const user = JSON.parse(userRaw);
          // If user has adminType, send it in the header
          if (user?.adminType) {
            config.headers['user-current-view'] = user.adminType;
          }
          // If adminType doesn't exist, don't send the header at all
        }
      } catch (error) {
        // If parsing fails, don't send the header
        console.warn('Failed to parse user data for user-current-view header:', error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR
customAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {

    if (error.response) {
      const status = error.response.status;

      switch (status) {
        case 401:
          // Invalid token - show toast and logout
          toast.error('Invalid token. Please login again.');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('idToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('isAuthenticated');
          window.location.href = '/';
          break;

        case 403:
          break;

        case 404:
          break;

        case 500:
          break;

        default:
          break;
      }
    } else if (error.request) {
      console.error('Network error:', error.request);
    } else {
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default customAxios;