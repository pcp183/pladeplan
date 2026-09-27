import { auth, currentUser } from '@clerk/nextjs/server';
import { DeletedBanner } from '@/components/DeletedBanner';
import { PlannerApp } from '@/components/PlannerApp';
import { billingConfigured, hasProAccess, planPill } from '@/lib/billing';
import { loadPlan } from '@/lib/billing-store';
import { clerkConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ konto?: string }>;
}) {
  const params = await searchParams;
  let pill = planPill({ billingReady: billingConfigured(), pro: false });
  if (clerkConfigured()) {
    try {
      const { userId } = await auth();
      if (userId) {
        const user = await currentUser();
        const plan = await loadPlan(userId, user?.publicMetadata);
        pill = planPill({ billingReady: billingConfigured(), pro: hasProAccess(plan) });
      }
    } catch (error) {
      console.error('plan pill failed', error instanceof Error ? error.name : 'unknown');
    }
  }
  return (
    <>
      {params.konto === 'slettet' ? <DeletedBanner /> : null}
      <PlannerApp clerkEnabled={clerkConfigured()} planPill={pill} />
    </>
  );
}
