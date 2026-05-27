import '../globals.css';
import type { Metadata } from 'next';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/sidebars/dashboard-sidebar/dashboard-siderbar';
import { ProtectedRoute } from '@/components/auth/protected-route';
import PageHeader from '@/components/shared/page-header';

export const metadata: Metadata = {
  title: 'Circles Admin - Dashboard',
  description: 'Main dashboard for Circles Admin Panel',
  icons: {
    icon: '/circles_logo.ico',
  },
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
        <main className="w-full overflow-x-hidden max-w-full flex flex-col min-h-screen">
          <PageHeader />
          <div className="flex-1 p-6 w-full">{children}</div>
        </main>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
