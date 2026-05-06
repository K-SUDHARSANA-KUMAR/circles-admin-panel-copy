import { ProtectedRoute } from '@/components/auth/protected-route';
import '../globals.css';

import { ReportsSidebar } from '@/components/sidebars/reports-sidebar/reports-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SFA Admin - Reports',
  description: 'Reports section for SFA Admin Panel',
};

export default function ReportsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute redirectTo="/">
      <SidebarProvider>
        <ReportsSidebar />
        <SidebarTrigger
          aria-label="Toggle navigation menu"
          className="block size-5 p-2 md:hidden"
        />
        <main className="w-full p-4">{children}</main>
      </SidebarProvider>
    </ProtectedRoute>
  );
}

