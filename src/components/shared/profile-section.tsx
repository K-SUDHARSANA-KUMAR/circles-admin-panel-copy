'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAppSelector } from '@/store/hooks';

interface ProfileSectionProps {
  className?: string;
}

export function ProfileSection({ className }: ProfileSectionProps) {
  const { user } = useAppSelector((state) => state.auth);
  const { signOut } = useAuth();

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className={`flex flex-col gap-4 text-sm ${className || ''}`}>
      <div className="font-semibold text-zinc-500 group-data-[collapsible=icon]:hidden">Profile</div>
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 group-data-[collapsible=icon]:mx-auto">
          <div className="text-freshleaf text-2xl font-semibold">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          <div>{user?.name || 'User'}</div>
          <div className="text-xs text-zinc-500">{user?.roleName || 'Temporary'}</div>
        </div>
      </div>
      {/* Expanded: full logout button */}
      <button
        onClick={handleLogout}
        aria-label="Logout"
        className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-200 px-2 py-1 text-sm font-medium text-zinc-800 transition-all duration-300 hover:bg-red-200 hover:text-red-400 group-data-[collapsible=icon]:hidden"
      >
        <LogOut className="h-5 w-5" />
        Logout
      </button>
      {/* Collapsed: icon-only logout at the bottom */}
      <button
        onClick={handleLogout}
        aria-label="Logout"
        className="hidden cursor-pointer h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-md bg-zinc-200 text-zinc-800 transition-all duration-300 hover:bg-red-200 hover:text-red-400 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:mx-auto"
      >
        <LogOut className="h-4 w-4 md:h-5 md:w-5" />
      </button>
    </div>
  );
}
