'use client';

import { useAuth, UserButton } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function AuthSlot() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    setSlot(document.getElementById('authSlot'));
  }, []);

  if (!slot || !isLoaded) return null;

  return createPortal(
    <>
      {!isSignedIn ? (
        <>
          <a href="/sign-in">Log ind</a>
          <a className="authsignup" href="/sign-up">
            Opret konto
          </a>
        </>
      ) : (
        <>
          <a href="/konto">Konto</a>
          <UserButton />
        </>
      )}
    </>,
    slot,
  );
}
