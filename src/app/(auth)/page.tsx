'use client';

import Loading from '@/components/ui/loading';
import { AuthHero } from './_components/auth-hero';
import { LoginForm } from './_components/login-form';
import { useLogin } from './_hooks/useLogin';

const Login = () => {
  const {
    form,
    verifyingAuth,
    showPassword,
    rememberMe,
    handleSubmit,
    handleToggleShowPassword,
    handleToggleRememberMe,
    signInPending,
  } = useLogin();

  if (verifyingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loading text="Verifying Authentication" />
        </div>
      </div>
    );
  }

  return (
    <section className="font-inter flex h-screen flex-col md:flex-row">
      <div className="flex h-full w-full flex-col justify-center md:h-auto md:w-1/2">
        <LoginForm
          form={form}
          showPassword={showPassword}
          rememberMe={rememberMe}
          signInPending={signInPending}
          handleSubmit={handleSubmit}
          handleToggleShowPassword={handleToggleShowPassword}
          handleToggleRememberMe={handleToggleRememberMe}
        />
      </div>
      <AuthHero />
    </section>
  );
};

export default Login;
