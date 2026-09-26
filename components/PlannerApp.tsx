'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { AuthSlot } from '@/components/AuthSlot';
import { PLANNER_MARKUP } from '@/lib/planner-markup';

function ensureCloud() {
  if (!window.__pladeplanCloud) {
    window.__pladeplanCloud = { signedIn: false, ready: false, cache: [] };
  }
  return window.__pladeplanCloud;
}

function ensureScript(onReady: () => void) {
  const existing = document.getElementById('pladeplan-script') as HTMLScriptElement | null;
  if (existing) {
    if (existing.dataset.loaded === '1') onReady();
    else existing.addEventListener('load', onReady, { once: true });
    return;
  }
  const script = document.createElement('script');
  script.id = 'pladeplan-script';
  script.src = '/planner.js';
  script.onload = () => {
    script.dataset.loaded = '1';
    onReady();
  };
  document.body.appendChild(script);
}

function GuestBridge() {
  useEffect(() => {
    const cloud = ensureCloud();
    cloud.signedIn = false;
    cloud.ready = false;
    cloud.degraded = false;
    cloud.authAvailable = false;
    ensureScript(() => {
      void window.__pladeplanOnAuth?.();
    });
  }, []);
  return null;
}

function ClerkBridge() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    const cloud = ensureCloud();
    cloud.signedIn = Boolean(isSignedIn);
    cloud.authAvailable = true;
    if (!isSignedIn) {
      cloud.ready = false;
      cloud.degraded = false;
    }
    ensureScript(() => {
      void window.__pladeplanOnAuth?.();
    });
  }, [isLoaded, isSignedIn]);

  return <AuthSlot />;
}

export function PlannerApp({ clerkEnabled }: { clerkEnabled: boolean }) {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: PLANNER_MARKUP }} />
      {clerkEnabled ? <ClerkBridge /> : <GuestBridge />}
    </>
  );
}
