import accessDenied from '@/assets/svgs/no-access.svg';
import { MENU_RIGHTS } from '@/constants/permissions.constant';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { useAppSelector } from '@/store/hooks';
import Link from 'next/link';

interface RequirePermissionProps {
  module: string;
  action?: string | string[];
  children: React.ReactNode;
}

export const RequirePermission = ({
  module,
  action = [MENU_RIGHTS.VIEW],
  children,
}: RequirePermissionProps) => {
  const actionsArray = Array.isArray(action) ? action : [action];
  const { hasAny } = useOptimizedPermissionChecker();
  const isSuperAdmin = useAppSelector((state) => state.auth.isSuperAdmin);

  if (isSuperAdmin || process.env.NEXT_PUBLIC_ENVIRONMENT === 'LOCAL') {
    return <>{children}</>;
  }

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
