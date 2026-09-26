import { PlannerApp } from '@/components/PlannerApp';
import { clerkConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return <PlannerApp clerkEnabled={clerkConfigured()} />;
}
