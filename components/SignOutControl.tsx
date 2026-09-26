'use client';

import { SignOutButton } from '@clerk/nextjs';

export function SignOutControl() {
  return (
    <SignOutButton redirectUrl="/">
      <button type="button" className="btn">
        Log ud
      </button>
    </SignOutButton>
  );
}
