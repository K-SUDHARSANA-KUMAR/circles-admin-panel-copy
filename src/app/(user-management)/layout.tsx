import { ProtectedRoute } from '@/components/auth/protected-route';
import '../globals.css';

import { UserSidebar } from '@/components/sidebars/user-sidebar/user-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SFA Admin - User Management',
  description: 'User management section for SFA Admin Panel',
};

export default function UserManagementLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute redirectTo="/">
      <SidebarProvider>
        <UserSidebar />
        <SidebarTrigger
          aria-label="Toggle navigation menu"
          className="block size-5 p-2 md:hidden"
        />
        <main className="w-full p-4">{children}</main>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
