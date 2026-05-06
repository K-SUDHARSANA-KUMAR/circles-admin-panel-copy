import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Circles - Login',
  description: 'Circles Admin Panel',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main className="w-full">{children}</main>;
}
