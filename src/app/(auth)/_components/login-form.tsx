'use client';

import Link from 'next/link';
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
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { LoginFormValues } from '../_schema/login';

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
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mx-auto w-[90%] space-y-4 md:w-[60%]"
      >
        <div className="flex flex-col items-center justify-center gap-2 pb-6">
          <div>
            <img src="/Circles_logo1.svg" alt="logo" className="h-auto w-25" />
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
              <FormLabel>Employee Code</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
                  <Input
                    className="pl-10"
                    placeholder="eg: 280902"
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

        <div className="flex items-center gap-2">
          <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={handleToggleRememberMe} />
          <label htmlFor="rememberMe" className="text-sm text-gray-500">
            Remember Me
          </label>
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
