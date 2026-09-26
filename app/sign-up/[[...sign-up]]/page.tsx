import { SignUp } from '@clerk/nextjs';
import { SetupNotice } from '@/components/SetupNotice';
import { SiteHeader } from '@/components/SiteHeader';
import { clerkConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <div className="authpage">
      <SiteHeader />
      <main className="authmain">
        {clerkConfigured() ? <SignUp /> : <SetupNotice />}
      </main>
    </div>
  );
}
