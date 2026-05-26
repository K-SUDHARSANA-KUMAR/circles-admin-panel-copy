import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { ILoginCredentials, ILoginResponse } from '../types/auth.types';
import { useAppDispatch } from '@/store/hooks';
import { clearAuthData, setAuthData } from '@/store/slices/authSlice';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  const signInWithPassword = useMutation({
    mutationFn: (data: ILoginCredentials) => authApi.signInWithPassword(data),
    onSuccess: (tokens: Partial<ILoginResponse>) => {
      localStorage.setItem('accessToken', tokens.accessToken || '');
      localStorage.setItem('idToken', tokens.idToken || '');
      localStorage.setItem('refreshToken', tokens.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(tokens.user || {}));
      localStorage.setItem('isAuthenticated', 'true');
      dispatch(setAuthData(tokens));
    },
  });

  const signInWithJWT = useMutation({
    mutationFn: (data: ILoginCredentials) => authApi.signInJWT(data),
    onSuccess: (tokens: Partial<ILoginResponse>) => {
      localStorage.setItem('accessToken', tokens.accessToken || '');
      localStorage.setItem('idToken', tokens.idToken || '');
      localStorage.setItem('refreshToken', tokens.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(tokens.user || {}));
      localStorage.setItem('isAuthenticated', 'true');
      dispatch(setAuthData(tokens));
    },
  });

  const signOut = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    dispatch(clearAuthData());
    router.push('/');
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem('accessToken');
  };

  return {
    signInWithPassword,
    signInWithJWT,
    signOut,
    isAuthenticated,
  };
}; 