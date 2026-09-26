import { DeletedBanner } from '@/components/DeletedBanner';
import { PlannerApp } from '@/components/PlannerApp';
import { clerkConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ konto?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      {params.konto === 'slettet' ? <DeletedBanner /> : null}
      <PlannerApp clerkEnabled={clerkConfigured()} />
    </>
  );
}
