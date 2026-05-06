import { ProtectedRoute } from '@/components/auth/protected-route';
import '../globals.css';

import { MasterSidebar } from '@/components/sidebars/master-siderbar/master-siderbar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SFA Admin - Master Management',
  description: 'Master data management section for SFA Admin Panel',
};

export default function MasterManagementLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute redirectTo="/">
      <SidebarProvider>
        <MasterSidebar />
        <SidebarTrigger
          aria-label="Toggle navigation menu"
          className="block size-5 p-2 md:hidden"
        />
        <main className="w-full p-4">{children}</main>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
