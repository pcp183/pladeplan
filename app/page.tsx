import { auth, currentUser } from '@clerk/nextjs/server';
import { DeletedBanner } from '@/components/DeletedBanner';
import { PlannerApp } from '@/components/PlannerApp';
import { billingConfigured, hasProAccess, planPill, savedProjectLimit } from '@/lib/billing';
import { loadPlan } from '@/lib/billing-store';
import { clerkConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Local review of the free-plan counter. Ignored outside `next dev`. */
function devPreviewCount(flag: string | undefined): number | null {
  if (process.env.NODE_ENV !== 'development') return null;
  if (flag === '2' || flag === '3') return Number(flag);
  return null;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ konto?: string; gratis?: string }>;
}) {
  const params = await searchParams;
  const previewCount = devPreviewCount(params.gratis);
  let pro = false;
  if (clerkConfigured() && previewCount == null) {
    try {
      const { userId } = await auth();
      if (userId) {
        const user = await currentUser();
        const plan = await loadPlan(userId, user?.publicMetadata);
        pro = hasProAccess(plan);
      }
    } catch (error) {
      console.error('plan pill failed', error instanceof Error ? error.name : 'unknown');
    }
  }
  const pill = planPill({
    billingReady: previewCount != null || billingConfigured(),
    pro: previewCount != null ? false : pro,
  });
  const saveLimit = previewCount != null ? 3 : savedProjectLimit(pro);
  return (
    <>
      {params.konto === 'slettet' ? <DeletedBanner /> : null}
      <PlannerApp
        clerkEnabled={clerkConfigured() && previewCount == null}
        planPill={pill}
        saveLimit={saveLimit}
        previewCount={previewCount}
      />
    </>
  );
}
