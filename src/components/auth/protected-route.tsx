'use client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute = ({
  children,
}: ProtectedRouteProps) => {
  return <>{children}</>;
};
