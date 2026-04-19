import './global.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Triage',
  description: 'Customer feedback triage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="corporate">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
