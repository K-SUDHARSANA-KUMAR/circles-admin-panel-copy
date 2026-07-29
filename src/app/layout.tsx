import './globals.css';

import GenericProvider from '@/providers/generic-provider';
import QueryProvider from '@/providers/query-provider';
import { ReduxProvider } from '@/providers/redux-provider';
import { DM_Sans } from 'next/font/google';
import type { Metadata } from 'next';
import { Suspense } from 'react';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'The Circles Club Admin Panel',
  description: 'The Circles Club Admin Panel',
  icons: {
    icon: '/circles_logo.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} font-sans antialiased overflow-x-hidden`}>
        <Suspense>
          <ReduxProvider>
            <QueryProvider>
              <GenericProvider>{children}</GenericProvider>
            </QueryProvider>
          </ReduxProvider>
        </Suspense>
      </body>
    </html>
  );
}
