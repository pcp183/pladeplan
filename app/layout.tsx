import { ClerkProvider } from '@clerk/nextjs';
import { daDK } from '@clerk/localizations';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { DeletedNotice } from '@/components/DeletedNotice';
import { SiteFooter } from '@/components/SiteFooter';
import { clerkConfigured } from '@/lib/env';
import '@/styles/planner.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const description =
  'Gratis dansk skæreplanlægger til plader: beregn skæreplan, udnyttelse og hvad pladerne koster ud fra priser slået op hos 10-4.dk, Silvan, XL-BYG, STARK, Johannes Fog, Bauhaus, Davidsen, Jem & Fix og Bygma.';

export const metadata: Metadata = {
  title: {
    default: 'Skæreseddel — dansk skæreplanlægger',
    template: '%s — Skæreseddel',
  },
  description,
  applicationName: 'Skæreseddel',
  openGraph: {
    title: 'Skæreseddel — dansk skæreplanlægger',
    description,
    siteName: 'Skæreseddel',
    locale: 'da_DK',
    type: 'website',
  },
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
      <body>
        <DeletedNotice />
        {children}
        <SiteFooter />
      </body>
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
          <DeletedNotice />
          {children}
          <SiteFooter />
        </ClerkProvider>
      </body>
    </html>
  );
}
