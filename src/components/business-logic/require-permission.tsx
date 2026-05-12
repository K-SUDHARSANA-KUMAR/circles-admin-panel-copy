import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Label } from '../core/label';
import accessDenied from '@/assets/svgs/no-access.svg';
import Link from 'next/link';

interface RequirePermissionProps {
  module: string;
  action?: string | string[];
  children: React.ReactNode;
}

export const RequirePermission = ({
  module,
  action = ['view'],
  children,
}: RequirePermissionProps) => {
  const actionsArray = Array.isArray(action) ? action : [action];
  const { hasAny } = useOptimizedPermissionChecker();

  if (!hasAny(module, actionsArray)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <img
            src={accessDenied.src}
            alt="Access Denied"
            className="h-auto w-40"
          />
          <div className="text-lg text-neutral-400">
            Oh no! Looks like you don't have access to this page.{' '}
            <Link href="/" className="text-primary hover:underline">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
