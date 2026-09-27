'use client';

import { useAuth, UserButton } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function AuthLinkItems() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <>
        <a className="authlink" href="/sign-in">
          Log ind
        </a>
        <a className="authsignup" href="/sign-up">
          Opret konto
        </a>
      </>
    );
  }

  return (
    <>
      <a className="authaccount" href="/konto">
        Konto
      </a>
      <UserButton />
    </>
  );
}

export function AuthLinks() {
  return (
    <span className="authslot">
      <AuthLinkItems />
    </span>
  );
}

export function AuthSlot() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById('authSlot'));
  }, []);

  if (!slot) return null;

  return createPortal(<AuthLinkItems />, slot);
}
