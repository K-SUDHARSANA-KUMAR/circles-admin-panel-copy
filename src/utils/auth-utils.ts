import { ILoginResponse } from "@/features/auth/types/auth.types";

export const getAuthFromLocalStorage = (): Partial<ILoginResponse> => {
    try {
      const accessToken = localStorage.getItem('accessToken') || null;
      const idToken = localStorage.getItem('idToken') || null;
      const refreshToken = localStorage.getItem('refreshToken') || null;
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;

      return {
        accessToken,
        idToken,
        refreshToken,
        user,
      };
    } catch {
      return {};
    }
  };
  