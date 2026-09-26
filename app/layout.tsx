import { ClerkProvider } from '@clerk/nextjs';
import { daDK } from '@clerk/localizations';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { clerkConfigured } from '@/lib/env';
import '@/styles/planner.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pladeplan — dansk skæreplanlægger',
  description:
    'Gratis dansk skæreplanlægger til plader: beregn skæreplan, udnyttelse og pladeforbrug, og sammenlign MDF-priser hos danske forhandlere.',
};

export const dynamic = 'force-dynamic';

const appearance = {
  variables: {
    colorPrimary: '#15392a',
    colorText: '#17231d',
    colorBackground: '#ffffff',
    borderRadius: '8px',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const body = (
    <html lang="da" className={inter.variable}>
      <body>{children}</body>
    </html>
  );

  if (!clerkConfigured()) return body;

  return (
    <html lang="da" className={inter.variable}>
      <body>
        <ClerkProvider
          localization={daDK}
          appearance={appearance}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          afterSignOutUrl="/"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
