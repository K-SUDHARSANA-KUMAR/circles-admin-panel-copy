import { ProtectedRoute } from '@/components/auth/protected-route';
import '../globals.css';

import { ConfigSidebar } from '@/components/sidebars/config-sidebar/config-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SFA Admin - Config Management',
  description: 'Configuration management section for SFA Admin Panel',
};

export default function ConfigManagementLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute redirectTo="/">
      <SidebarProvider>
        <ConfigSidebar />
        <SidebarTrigger
          aria-label="Toggle navigation menu"
          className="block size-5 p-2 md:hidden"
        />
        <main className="w-full p-4">{children}</main>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
