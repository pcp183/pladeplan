'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { AuthSlot } from '@/components/AuthSlot';
import { applyPlanPill } from '@/lib/plan-pill';
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

function GuestBridge({ saveLimit }: { saveLimit: number | null }) {
  useEffect(() => {
    const cloud = ensureCloud();
    cloud.signedIn = false;
    cloud.ready = false;
    cloud.degraded = false;
    cloud.authAvailable = false;
    cloud.preview = false;
    cloud.saveLimit = saveLimit;
    ensureScript(() => {
      void window.__pladeplanOnAuth?.();
    });
  }, [saveLimit]);
  return null;
}

function ClerkBridge({ saveLimit }: { saveLimit: number | null }) {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    const cloud = ensureCloud();
    cloud.signedIn = Boolean(isSignedIn);
    cloud.authAvailable = true;
    cloud.preview = false;
    cloud.saveLimit = saveLimit;
    if (!isSignedIn) {
      cloud.ready = false;
      cloud.degraded = false;
    }
    ensureScript(() => {
      void window.__pladeplanOnAuth?.();
    });
  }, [isLoaded, isSignedIn, saveLimit]);

  return <AuthSlot />;
}

/** Development-only stand-in so the free-plan counter can be reviewed before Stripe is configured. */
function PreviewBridge({ count, saveLimit }: { count: number; saveLimit: number }) {
  useEffect(() => {
    const cloud = ensureCloud();
    cloud.signedIn = true;
    cloud.ready = true;
    cloud.degraded = false;
    cloud.authAvailable = true;
    cloud.preview = true;
    cloud.saveLimit = saveLimit;
    cloud.cache = Array.from({ length: count }, (_, index) => ({
      id: `preview-${index + 1}`,
      n: `Skæreseddel ${index + 1}`,
      updatedAt: new Date().toISOString(),
      p: [['Hylde', 400, 600, 1]],
      w: '1220',
      h: '2440',
      m: 18,
      k: 3,
    }));
    cloud.push = () => {};
    ensureScript(() => {
      void window.__pladeplanOnAuth?.();
    });
  }, [count, saveLimit]);
  return null;
}

export function PlannerApp({
  clerkEnabled,
  planPill,
  saveLimit,
  previewCount = null,
}: {
  clerkEnabled: boolean;
  planPill: { text: string; title: string; pro: boolean };
  saveLimit: number | null;
  previewCount?: number | null;
}) {
  const markup = applyPlanPill(PLANNER_MARKUP, planPill);
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: markup }} />
      {previewCount != null ? (
        <PreviewBridge count={previewCount} saveLimit={saveLimit ?? 3} />
      ) : clerkEnabled ? (
        <ClerkBridge saveLimit={saveLimit} />
      ) : (
        <GuestBridge saveLimit={saveLimit} />
      )}
    </>
  );
}
