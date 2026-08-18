'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { IconLoader3 } from '@tabler/icons-react';
import { Eye, EyeOff, Lock, User, ArrowLeft, KeyRound } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { LoginFormValues } from '../_schema/login';
import { forgotPassword, confirmForgotPassword } from '@/services/login.service';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

type LoginFormProps = {
  form: UseFormReturn<LoginFormValues>;
  showPassword: boolean;
  rememberMe: boolean;
  signInPending: boolean;
  handleSubmit: (values: LoginFormValues) => void;
  handleToggleShowPassword: () => void;
  handleToggleRememberMe: () => void;
};

export const LoginForm = ({
  form,
  showPassword,
  rememberMe,
  signInPending,
  handleSubmit,
  handleToggleShowPassword,
  handleToggleRememberMe,
}: LoginFormProps) => {
  const [mode, setMode] = useState<'login' | 'forgot' | 'confirm'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleSendCode = async () => {
    if (!forgotEmail) {
      toast.error('Please enter your email address');
      return;
    }
    setForgotLoading(true);
    try {
      await forgotPassword({ email: forgotEmail });
      toast.success('Verification code sent to your email!');
      setMode('confirm');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!verificationCode || !newPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setConfirmLoading(true);
    try {
      await confirmForgotPassword({
        email: forgotEmail,
        code: verificationCode,
        newPassword: newPassword,
      });
      toast.success('Password successfully reset! You can now log in.');
      form.setValue('userName', forgotEmail);
      setMode('login');
      // clear fields
      setVerificationCode('');
      setNewPassword('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to reset password. Please check your code and try again.');
    } finally {
      setConfirmLoading(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <div className="mx-auto w-[90%] space-y-6 md:w-[60%] animate-in fade-in duration-300">
        <div className="flex flex-col items-center justify-center gap-2 pb-2">
          <div>
            <img src="/circles_icon_white.svg" alt="logo" className="h-16 w-16" />
          </div>
          <div className="space-y-1 text-center">
            <h3 className="font-montserrat text-3xl font-bold">Forgot Password</h3>
            <h6 className="text-sm text-gray-500">
              Enter your email address to receive a verification code.
            </h6>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Email Address</Label>
            <div className="relative">
              <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
              <Input
                type="email"
                className="pl-10"
                placeholder="eg: irfan@nokha.in"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="button"
            className="w-full rounded-md p-2 transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSendCode}
            disabled={forgotLoading || !forgotEmail}
          >
            <div className="flex items-center justify-center gap-2">
              {forgotLoading && <IconLoader3 className="h-4 w-4 animate-spin" />}
              {forgotLoading ? 'Sending Code...' : 'Send Verification Code'}
            </div>
          </Button>

          <button
            type="button"
            onClick={() => setMode('login')}
            className="flex w-full items-center justify-center gap-2 text-sm text-gray-500 hover:text-white transition-colors pt-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Log In</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'confirm') {
    return (
      <div className="mx-auto w-[90%] space-y-6 md:w-[60%] animate-in fade-in duration-300">
        <div className="flex flex-col items-center justify-center gap-2 pb-2">
          <div>
            <img src="/circles_icon_white.svg" alt="logo" className="h-16 w-16" />
          </div>
          <div className="space-y-1 text-center">
            <h3 className="font-montserrat text-3xl font-bold">Reset Password</h3>
            <h6 className="text-sm text-gray-500">
              Enter the code sent to your email and set your new password.
            </h6>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Email Address</Label>
            <div className="relative">
              <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
              <Input
                type="email"
                className="pl-10 bg-zinc-900 border-white/5 opacity-70 cursor-not-allowed"
                value={forgotEmail}
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Verification Code</Label>
            <div className="relative">
              <KeyRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500 animate-pulse" />
              <Input
                type="text"
                className="pl-10"
                placeholder="Enter verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">New Password</Label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
              <Input
                className="pr-10 pl-10"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="eg: *********"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500"
                tabIndex={-1}
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="button"
            className="w-full rounded-md p-2 transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleResetPassword}
            disabled={confirmLoading || !verificationCode || !newPassword}
          >
            <div className="flex items-center justify-center gap-2">
              {confirmLoading && <IconLoader3 className="h-4 w-4 animate-spin" />}
              {confirmLoading ? 'Resetting Password...' : 'Reset Password'}
            </div>
          </Button>

          <button
            type="button"
            onClick={() => setMode('login')}
            className="flex w-full items-center justify-center gap-2 text-sm text-gray-500 hover:text-white transition-colors pt-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Log In</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mx-auto w-[90%] space-y-4 md:w-[60%] animate-in fade-in duration-300"
      >
        <div className="flex flex-col items-center justify-center gap-2 pb-6">
          <div>
            <img src="/circles_icon_white.svg" alt="logo" className="h-16 w-16" />
          </div>
          <div className="space-y-1 text-center">
            <h3 className="font-montserrat text-3xl font-bold">Log In</h3>
            <h6 className="text-sm text-gray-500">
              {new Date().getHours() < 12
                ? 'Good Morning'
                : new Date().getHours() < 18
                  ? 'Good Afternoon'
                  : 'Good Evening'}
              ! Please enter your credentials.
            </h6>
          </div>
        </div>

        <FormField
          control={form.control}
          name="userName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
                  <Input
                    className="pl-10"
                    placeholder="eg: irfan@nokha.in"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
                  <Input
                    className="pr-10 pl-10"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="eg: *********"
                    {...field}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500"
                    tabIndex={-1}
                    onClick={handleToggleShowPassword}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={handleToggleRememberMe}
            />
            <label htmlFor="rememberMe" className="text-sm text-gray-500 select-none cursor-pointer">
              Remember Me
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              setForgotEmail(form.getValues('userName') || '');
              setMode('forgot');
            }}
            className="text-sm font-semibold text-primary hover:underline hover:text-primary/80 transition-colors select-none"
          >
            Forgot Password?
          </button>
        </div>

        <Button
          className="w-full rounded-md p-2 transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={signInPending}
        >
          <div className="flex items-center justify-center gap-2">
            {signInPending && <IconLoader3 className="h-4 w-4 animate-spin" />}
            {signInPending ? 'Signing In...' : 'Log In'}
          </div>
        </Button>
      </form>
    </Form>
  );
};
