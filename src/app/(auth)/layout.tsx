import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Circles Club - Login',
  description: 'The Circles Club Admin Panel',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main className="w-full">{children}</main>;
}
