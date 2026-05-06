import '../globals.css';
import type { Metadata } from 'next';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/sidebars/dashboard-sidebar/dashboard-siderbar';
import { ProtectedRoute } from '@/components/auth/protected-route';

export const metadata: Metadata = {
  title: 'SFA Admin - Dashboard',
  description: 'Main dashboard for SFA Admin Panel',
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute redirectTo="/">
      <SidebarProvider>
        <DashboardSidebar />
        <main className="w-full p-4 overflow-x-hidden max-w-full">{children}</main>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
