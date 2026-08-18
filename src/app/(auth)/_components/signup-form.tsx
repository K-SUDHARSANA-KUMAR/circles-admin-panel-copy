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
import { IconLoader3 } from '@tabler/icons-react';
import { Eye, EyeOff, Lock, User, Mail } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { SignupFormValues } from '../_schema/signup';

type SignupFormProps = {
  form: UseFormReturn<SignupFormValues>;
  showPassword: boolean;
  showConfirmPassword: boolean;
  signUpPending: boolean;
  handleSubmit: (values: SignupFormValues) => void;
  handleToggleShowPassword: () => void;
  handleToggleShowConfirmPassword: () => void;
};

export const SignupForm = ({
  form,
  showPassword,
  showConfirmPassword,
  signUpPending,
  handleSubmit,
  handleToggleShowPassword,
  handleToggleShowConfirmPassword,
}: SignupFormProps) => {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mx-auto w-[90%] space-y-4 md:w-[60%]"
      >
        <div className="flex flex-col items-center justify-center gap-2 pb-6">
          <div>
            <img src="/circles_icon_white.svg" alt="logo" className="h-16 w-16" />
          </div>
          <div className="space-y-1 text-center">
            <h3 className="font-montserrat text-3xl font-bold">Sign Up</h3>
            <h6 className="text-sm text-gray-500">
              Create an account to get started.
            </h6>
          </div>
        </div>

        <FormField
          control={form.control}
          name="userName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee Name</FormLabel>
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
                  <Input
                    type="email"
                    className="pl-10"
                    placeholder="eg: jane.doe@example.com"
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

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
                  <Input
                    className="pr-10 pl-10"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="eg: *********"
                    {...field}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500"
                    tabIndex={-1}
                    onClick={handleToggleShowConfirmPassword}
                    aria-label={
                      showConfirmPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showConfirmPassword ? (
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

        <Button
          className="w-full rounded-md p-2 transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-50 mt-4"
          type="submit"
          disabled={signUpPending}
        >
          <div className="flex items-center justify-center gap-2">
            {signUpPending && <IconLoader3 className="h-4 w-4 animate-spin" />}
            {signUpPending ? 'Signing Up...' : 'Sign Up'}
          </div>
        </Button>
        <div className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/" className="text-primary hover:underline font-medium">
            Log In
          </Link>
        </div>
      </form>
    </Form>
  );
};
