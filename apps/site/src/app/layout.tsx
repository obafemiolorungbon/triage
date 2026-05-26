import './global.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Triage - self-hosted feedback intake',
  description:
    'An open-source feedback widget, AI triage pipeline, and support queue for product teams.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
