'use client';

import Script from 'next/script';
import { useEffect } from 'react';

declare global {
  interface Window {
    TriageWidget?: {
      identify: (
        user?: Record<string, unknown>,
        metadata?: Record<string, unknown>,
        opts?: { userHash?: string },
      ) => void;
      open: (opts?: { type?: string; prefill?: Record<string, unknown> }) => void;
      close: () => void;
      prefill: (values: Record<string, unknown>) => void;
    };
  }
}

export function WidgetLoader({
  origin,
  widgetKey,
}: {
  origin: string;
  widgetKey: string;
}) {
  useEffect(() => {
    const sendContext = () => {
      window.TriageWidget?.identify(
        {
          email: 'ada@northstar.example',
          name: 'Ada N.',
          accountId: 'acct_enterprise_42',
          company: 'Northstar Labs',
        },
        {
          plan: 'enterprise',
          environment: 'production',
          affectedUsers: 42,
          appVersion: '2026.05.23',
          source: 'playground',
        },
      );
    };

    sendContext();
    const timer = window.setInterval(sendContext, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Script
      src={`${origin.replace(/\/$/, '')}/embed.js`}
      data-widget-key={widgetKey}
      data-position="bottom-right"
      strategy="afterInteractive"
    />
  );
}
