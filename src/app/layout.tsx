import './globals.css';

import GenericProvider from '@/providers/generic-provider';
import QueryProvider from '@/providers/query-provider';
import { ReduxProvider } from '@/providers/redux-provider';
import { Montserrat, Inter, Instrument_Serif, Figtree } from 'next/font/google';

import type { Metadata } from 'next';
import { Suspense } from 'react';

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: ['400'],
});

export const metadata: Metadata = {
  title: 'Circles Admin Panel',
  description: 'Circles Admin Panel',
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
      <body className={`${montserrat.variable} ${inter.variable} ${figtree.variable} ${instrumentSerif.variable} antialiased overflow-x-hidden`}>
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
