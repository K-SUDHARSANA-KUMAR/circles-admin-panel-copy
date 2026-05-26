'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import NavKeys from '@/constants/navkeys';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { loginSchema, type LoginFormValues } from '../_schema/login';
import { v4 as uuidv4 } from 'uuid';

export const useLogin = () => {
  const router = useRouter();
  const { signInWithJWT } = useAuth();
  const [verifyingAuth, setVerifyingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userName: '', password: '' },
  });

  useEffect(() => {
    const isLocalAuthenticated =
      localStorage?.getItem('isAuthenticated') === 'true';
    if (isLocalAuthenticated) {
      router.replace(NavKeys.DashboardOverview);
      return;
    }
    setVerifyingAuth(false);

    const savedUserName = localStorage.getItem('rememberedUserName');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedUserName && savedPassword) {
      form.setValue('userName', savedUserName);
      form.setValue('password', savedPassword);
      setRememberMe(true);
    }
  }, [router, form]);

  const handleToggleShowPassword = () => setShowPassword((prev) => !prev);
  const handleToggleRememberMe = () => setRememberMe((prev) => !prev);

  const handleSubmit = async (values: LoginFormValues) => {

    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem('deviceId', deviceId);
    }

    signInWithJWT.mutate(
      {
        employeeCode: values.userName,
        password: values.password,
        fcmToken: undefined,
        deviceId: deviceId as string,
        deviceType: 'web',
        platform: 'web',
      },
      {
        onSuccess: () => {
          toast.success('Sign in successful!', { id: 'sign-in', closeButton: true, });
          router.replace(NavKeys.DashboardOverview);
        },
        onError: (error: any) => {
          console.error('Login failed:', error);
          
          let errorMessage = 'Sign in failed. Please check your credentials.';
          
          if (error?.message?.includes('AUTH_BASE_URL is not configured')) {
            errorMessage = 'Authentication service is not configured. Please contact support.';
          } else if (error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          toast.error(errorMessage, { id: 'sign-in' });
        },
      }
    );

    if (rememberMe) {
      localStorage.setItem('rememberedUserName', values.userName);
      localStorage.setItem('rememberedPassword', values.password);
    } else {
      localStorage.removeItem('rememberedUserName');
      localStorage.removeItem('rememberedPassword');
    }
  };

  return {
    form,
    verifyingAuth,
    showPassword,
    rememberMe,
    handleSubmit,
    handleToggleShowPassword,
    handleToggleRememberMe,
    signInPending: signInWithJWT.isPending,
  };
};
