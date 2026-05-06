import { ProtectedRoute } from '@/components/auth/protected-route';
import '../globals.css';

import { WarehouseSidebar } from '@/components/sidebars/warehouse-sidebar/warehouse-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SFA Admin - Warehouse Management',
  description: 'Warehouse management section for SFA Admin Panel',
};

export default function WarehouseManagementLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute redirectTo="/">
      <SidebarProvider>
        <WarehouseSidebar />
        <SidebarTrigger
          aria-label="Toggle navigation menu"
          className="block size-5 p-2 md:hidden"
        />
        <main className="w-full p-4">{children}</main>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
