'use client';

import { useState } from 'react';

type Offer = {
  slot: 'month' | 'year';
  title: string;
  amountLabel: string | null;
};

type Flash = 'cancelled' | 'pending' | 'synced' | 'unknown' | null;

function stripeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (url.hostname !== 'checkout.stripe.com' && url.hostname !== 'billing.stripe.com') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function BillingPanel({
  configured,
  testMode,
  planName,
  badge,
  badgeTone,
  periodText,
  projectCount,
  offers,
  canManage,
  flash,
}: {
  configured: boolean;
  testMode: boolean;
  planName: string;
  badge: string;
  badgeTone: 'wait' | 'pro' | 'warn' | '';
  periodText: string | null;
  projectCount: number | null;
  offers: Offer[];
  canManage: boolean;
  flash: Flash;
}) {
  const [busy, setBusy] = useState<'month' | 'year' | 'portal' | null>(null);
  const [error, setError] = useState('');

  async function open(path: string, slot: 'month' | 'year' | 'portal', body?: { interval: 'month' | 'year' }) {
    if (busy) return;
    setError('');
    setBusy(slot);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const payload = (await response.json().catch(() => null)) as { url?: unknown; error?: string } | null;
      const url = stripeUrl(payload?.url);
      if (!response.ok || !url) {
        setError(payload?.error || 'Kassen kunne ikke åbnes. Prøv igen.');
        setBusy(null);
        return;
      }
      window.location.assign(url);
    } catch {
      setError('Kassen kunne ikke åbnes. Prøv igen.');
      setBusy(null);
    }
  }

  const saved =
    projectCount !== null ? ` (${projectCount} ${projectCount === 1 ? 'skæreseddel' : 'skæresedler'})` : '';

  return (
    <>
      <p>
        Nuværende plan: <span className={planName === 'Pro' ? 'statuspill pro' : 'statuspill'}>{planName}</span>
      </p>
      <p>
        Pro: <span className={badgeTone ? `statuspill ${badgeTone}` : 'statuspill'}>{badge}</span>
      </p>
      {periodText ? <p>{periodText}</p> : null}
      <p>
        Alle nuværende funktioner er gratis, også gemte skæresedler på kontoen{saved}.{' '}
        {configured
          ? 'Pro er et valgfrit abonnement. Beløbet kommer fra Stripe og vises igen i kassen, før der betales.'
          : 'Pro kommer snart og kan ikke købes.'}
      </p>
      {flash === 'cancelled' ? (
        <div className="notice">
          <strong>Betalingen blev annulleret.</strong> Der er ikke trukket noget.
        </div>
      ) : null}
      {flash === 'synced' ? (
        <div className="notice ok">
          <strong>Pro er aktivt.</strong> Tak. Du kan skifte kort eller opsige via Stripe.
        </div>
      ) : null}
      {flash === 'pending' ? (
        <div className="notice">
          <strong>Betalingen er ikke bekræftet endnu.</strong> Status opdateres, når Stripe sender besked. Genindlæs om
          et øjeblik.
        </div>
      ) : null}
      {flash === 'unknown' ? (
        <div className="notice">
          <strong>Betalingen kunne ikke knyttes til kontoen.</strong> Der er ikke ændret noget.
        </div>
      ) : null}
      {!configured ? (
        <div className="notice">
          <strong>Pro kommer snart.</strong> Der er intet kasseforløb, intet abonnement og ingen betaling knyttet til
          kontoen.
        </div>
      ) : null}
      {configured && testMode ? (
        <div className="notice">
          Stripe kører i testtilstand. Der trækkes ingen rigtige penge. Brug et testkort fra Stripe.
        </div>
      ) : null}
      {configured && planName !== 'Pro' && offers.length === 0 && !canManage ? (
        <div className="notice">
          <strong>Pro kan ikke købes lige nu.</strong> Der er ingen aktiv pris i Stripe, så der åbnes ingen kasse.
        </div>
      ) : null}
      {configured && planName !== 'Pro' && offers.length > 0 ? (
        <div className="billingoffers">
          {offers.map((offer) => (
            <button
              key={offer.slot}
              type="button"
              className="btn primary offerbtn"
              disabled={busy !== null}
              onClick={() => open('/api/billing/checkout', offer.slot, { interval: offer.slot })}
            >
              <span>{busy === offer.slot ? 'Åbner kassen…' : offer.title}</span>
              <span className="offerprice">{offer.amountLabel ?? 'Prisen vises i kassen'}</span>
            </button>
          ))}
        </div>
      ) : null}
      {configured && canManage ? (
        <div className="accountactions">
          <button type="button" className="btn" disabled={busy !== null} onClick={() => open('/api/billing/portal', 'portal')}>
            {busy === 'portal' ? 'Åbner…' : 'Administrer abonnement'}
          </button>
        </div>
      ) : null}
      {configured ? <p>Kortoplysninger behandles af Stripe. Skæreseddel gemmer ikke kortnummeret.</p> : null}
      {error ? (
        <p className="formerror" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
