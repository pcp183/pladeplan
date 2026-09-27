import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { SetupNotice } from '@/components/SetupNotice';
import { SiteHeader } from '@/components/SiteHeader';
import { clerkConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Log ind',
};

export default function SignInPage() {
  return (
    <div className="authpage">
      <SiteHeader />
      <main className="authmain">
        {clerkConfigured() ? <SignIn /> : <SetupNotice />}
      </main>
    </div>
  );
}
