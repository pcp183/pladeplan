import { clerkClient } from '@clerk/nextjs/server';
import { DatabaseNotConfiguredError, databaseUrl, ensureSchema, getSql } from './db';
import {
  billingMetadata,
  freePlan,
  shouldApplyEvent,
  snapshotFromMetadata,
  type PlanSnapshot,
} from './billing';

type BillingRow = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  price_id: string | null;
  current_period_end: string | Date | null;
  cancel_at_period_end: boolean | null;
  last_event_created: string | number | null;
};

function asIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function snapshotFromRow(row: BillingRow): PlanSnapshot {
  const status = row.status || 'none';
  const base = snapshotFromMetadata({
    stripeStatus: status,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePriceId: row.price_id,
    stripeCurrentPeriodEnd: asIso(row.current_period_end),
    stripeCancelAtPeriodEnd: row.cancel_at_period_end === true,
    stripeEventCreated: Number(row.last_event_created ?? 0),
  });
  return base ?? freePlan();
}

export async function readBilling(userId: string): Promise<PlanSnapshot | null> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    SELECT stripe_customer_id, stripe_subscription_id, status, price_id,
           current_period_end, cancel_at_period_end, last_event_created
    FROM pladeplan_billing
    WHERE user_id = ${userId}
    LIMIT 1
  `) as BillingRow[];
  const row = rows[0];
  return row ? snapshotFromRow(row) : null;
}

export async function findUserIdByCustomer(customerId: string): Promise<string | null> {
  if (!databaseUrl()) return null;
  await ensureSchema();
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    SELECT user_id
    FROM pladeplan_billing
    WHERE stripe_customer_id = ${customerId}
    LIMIT 1
  `) as Array<{ user_id: string }>;
  return rows[0]?.user_id ?? null;
}

export async function rememberCustomer(userId: string, customerId: string): Promise<void> {
  if (databaseUrl()) {
    await ensureSchema();
    const sql = getSql();
    if (sql) {
      await sql`
        INSERT INTO pladeplan_billing (
          user_id, stripe_customer_id, status, cancel_at_period_end, last_event_created, updated_at
        )
        VALUES (${userId}, ${customerId}, 'none', FALSE, 0, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          stripe_customer_id = EXCLUDED.stripe_customer_id,
          updated_at = NOW()
      `;
    }
  }
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { stripeCustomerId: customerId },
    });
  } catch (error) {
    console.error('clerk customer id failed', error instanceof Error ? error.name : 'unknown');
  }
}

/** Returns false when an older Stripe event loses to one already stored. */
export async function persistPlan(userId: string, snapshot: PlanSnapshot): Promise<boolean> {
  if (databaseUrl()) {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new DatabaseNotConfiguredError();
    const rows = (await sql`
      INSERT INTO pladeplan_billing (
        user_id,
        stripe_customer_id,
        stripe_subscription_id,
        status,
        price_id,
        current_period_end,
        cancel_at_period_end,
        last_event_created,
        updated_at
      )
      VALUES (
        ${userId},
        ${snapshot.stripeCustomerId},
        ${snapshot.stripeSubscriptionId},
        ${snapshot.status},
        ${snapshot.priceId},
        ${snapshot.currentPeriodEnd}::timestamptz,
        ${snapshot.cancelAtPeriodEnd},
        ${snapshot.lastEventCreated},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, pladeplan_billing.stripe_customer_id),
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        status = EXCLUDED.status,
        price_id = EXCLUDED.price_id,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        last_event_created = EXCLUDED.last_event_created,
        updated_at = NOW()
      WHERE pladeplan_billing.last_event_created <= EXCLUDED.last_event_created
      RETURNING user_id
    `) as Array<{ user_id: string }>;
    if (!rows[0]) return false;
    await writeClerkMetadata(userId, snapshot, false);
    return true;
  }

  const existing = await readClerkPlan(userId);
  if (existing && !shouldApplyEvent(existing.lastEventCreated, snapshot.lastEventCreated)) return false;
  await writeClerkMetadata(userId, snapshot, true);
  return true;
}

async function readClerkPlan(userId: string): Promise<PlanSnapshot | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return snapshotFromMetadata(user.publicMetadata);
  } catch (error) {
    console.error('clerk billing read failed', error instanceof Error ? error.name : 'unknown');
    return null;
  }
}

async function writeClerkMetadata(userId: string, snapshot: PlanSnapshot, required: boolean): Promise<void> {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: billingMetadata(snapshot),
    });
  } catch (error) {
    console.error('clerk billing metadata failed', error instanceof Error ? error.name : 'unknown');
    if (required) throw error;
  }
}

export async function deleteBillingRow(userId: string): Promise<void> {
  if (!databaseUrl()) return;
  await ensureSchema();
  const sql = getSql();
  if (!sql) return;
  await sql`DELETE FROM pladeplan_billing WHERE user_id = ${userId}`;
}

export async function loadPlan(userId: string, metadata: unknown): Promise<PlanSnapshot> {
  if (databaseUrl()) {
    try {
      const row = await readBilling(userId);
      if (row) return row;
    } catch (error) {
      if (!(error instanceof DatabaseNotConfiguredError)) {
        console.error('billing load failed', error instanceof Error ? error.name : 'unknown');
      }
    }
  }
  return snapshotFromMetadata(metadata) ?? freePlan();
}
