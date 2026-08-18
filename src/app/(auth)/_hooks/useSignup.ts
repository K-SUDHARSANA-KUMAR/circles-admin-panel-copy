'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signupSchema, type SignupFormValues } from '../_schema/signup';

export const useSignup = () => {
  const router = useRouter();
  const [signUpPending, setSignUpPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { userName: '', email: '', password: '', confirmPassword: '' },
  });

  const handleToggleShowPassword = () => setShowPassword((prev) => !prev);
  const handleToggleShowConfirmPassword = () => setShowConfirmPassword((prev) => !prev);

  const handleSubmit = async (values: SignupFormValues) => {
    setSignUpPending(true);

    // Mock API call
    setTimeout(() => {
      setSignUpPending(false);
      toast.success('Sign up successful! Please log in.');
      router.push('/');
    }, 1000);
  };

  return {
    form,
    showPassword,
    showConfirmPassword,
    handleSubmit,
    handleToggleShowPassword,
    handleToggleShowConfirmPassword,
    signUpPending,
  };
};
