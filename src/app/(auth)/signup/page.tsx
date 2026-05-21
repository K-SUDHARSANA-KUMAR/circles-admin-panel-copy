'use client';

import { AuthHero } from '../_components/auth-hero';
import { SignupForm } from '../_components/signup-form';
import { useSignup } from '../_hooks/useSignup';

const Signup = () => {
  const {
    form,
    showPassword,
    showConfirmPassword,
    handleSubmit,
    handleToggleShowPassword,
    handleToggleShowConfirmPassword,
    signUpPending,
  } = useSignup();

  return (
    <section className="font-inter flex h-screen flex-col md:flex-row">
      <div className="flex h-full w-full flex-col justify-center md:h-auto md:w-1/2">
        <SignupForm
          form={form}
          showPassword={showPassword}
          showConfirmPassword={showConfirmPassword}
          signUpPending={signUpPending}
          handleSubmit={handleSubmit}
          handleToggleShowPassword={handleToggleShowPassword}
          handleToggleShowConfirmPassword={handleToggleShowConfirmPassword}
        />
      </div>
      <AuthHero />
    </section>
  );
};

export default Signup;
