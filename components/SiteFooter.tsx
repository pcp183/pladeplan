import { billingConfigured } from '@/lib/billing';

export function SiteFooter() {
  return (
    <footer className="sitefoot">
      <a href="/privatliv">Privatliv</a>
      <span> · Skæreplanen kan bruges uden konto · </span>
      {billingConfigured() ? <a href="/konto#abonnement">Pro-abonnement</a> : <span>Pro kommer snart</span>}
    </footer>
  );
}
