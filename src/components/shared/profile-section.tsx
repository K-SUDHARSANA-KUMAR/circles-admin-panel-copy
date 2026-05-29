'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
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
    <div className={`flex flex-col gap-2 text-sm ${className || ''}`}>
      {/* <div className="font-semibold text-zinc-500 text-[10px] uppercase tracking-widest group-data-[collapsible=icon]:hidden">Profile</div> */}
      {/* <Link 
        href="/dashboard/profile" 
        className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-0.5 rounded-lg transition-colors cursor-pointer group/profile"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 group-data-[collapsible=icon]:mx-auto transition-transform group-hover/profile:scale-105">
          <div className="text-primary text-lg font-semibold">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="text-xs font-semibold text-foreground">{user?.name || 'User'}</div>
          <div className="text-[10px] text-zinc-500">{user?.roleName || 'Temporary'}</div>
        </div>
      </Link> */}
      {/* Expanded: full logout button */}
      <button
        onClick={handleLogout}
        aria-label="Logout"
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 transition-all duration-300 hover:bg-red-200 hover:text-red-400 group-data-[collapsible=icon]:hidden"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
      {/* Collapsed: icon-only logout at the bottom */}
      <button
        onClick={handleLogout}
        aria-label="Logout"
        className="hidden cursor-pointer h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-md bg-zinc-200 text-zinc-800 transition-all duration-300 hover:bg-red-200 hover:text-red-400 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:mx-auto"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
