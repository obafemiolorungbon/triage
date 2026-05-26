import './global.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Triage Widget Playground',
  description: 'Demo the Triage feedback widget on a marketing page and inside a web app.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
