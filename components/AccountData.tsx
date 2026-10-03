'use client';

import { useClerk } from '@clerk/nextjs';
import { useState } from 'react';
import { confirmationHint, confirmationMatches } from '@/lib/confirm';

const LOCAL_KEYS = ['pladeplan-projects', 'pladeplan', 'pladeplan-sheet-prices'];

export function AccountData({ email }: { email: string | null }) {
  const { signOut } = useClerk();
  const hint = confirmationHint(email);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const confirmed = confirmationMatches(email, typed);

  async function download() {
    setError('');
    setBusy('export');
    try {
      const response = await fetch('/api/account', { headers: { accept: 'application/json' } });
      if (!response.ok) {
        setError('Kunne ikke hente dine data. Prøv igen.');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'skaereseddel-data.json';
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Kunne ikke hente dine data. Prøv igen.');
    } finally {
      setBusy(null);
    }
  }

  async function removeAccount() {
    if (!confirmed || busy) return;
    setError('');
    setBusy('delete');
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: typed.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error || 'Kontoen kunne ikke slettes.');
        setBusy(null);
        return;
      }
      for (const key of LOCAL_KEYS) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* browser storage can be blocked */
        }
      }
      try {
        sessionStorage.removeItem('pladeplan-migrate-asked');
        sessionStorage.removeItem('skaereseddel-retail-prices');
        sessionStorage.setItem('pladeplan-account-deleted', '1');
      } catch {
        /* ignore */
      }
      try {
        await signOut();
      } catch {
        /* sessionen er allerede væk, når brugeren er slettet */
      }
      window.location.assign('/?konto=slettet');
    } catch {
      setError('Kontoen kunne ikke slettes. Prøv igen.');
      setBusy(null);
    }
  }

  return (
    <section className="card pad">
      <h2>Dine oplysninger</h2>
      <p>
        Du kan hente en kopi af de skæresedler, der er gemt på kontoen, eller slette kontoen helt. Læs mere i{' '}
        <a href="/privatliv">privatlivspolitikken</a>.
      </p>
      <div className="accountactions">
        <button type="button" className="btn" onClick={download} disabled={busy !== null}>
          {busy === 'export' ? 'Henter…' : 'Hent mine data (JSON)'}
        </button>
      </div>
      <h3 className="dangerhead">Slet konto</h3>
      <p>
        Sletning fjerner kontoen og alle skæresedler, der er gemt på serveren for denne konto. Der laves ingen
        sikkerhedskopi. Kladde og gemte skæresedler i denne browser fjernes også. Det kan ikke fortrydes.
      </p>
      <label className="label" htmlFor="deleteConfirm">
        Skriv {email ? 'din e-mail' : 'SLET'} for at bekræfte
      </label>
      <input
        id="deleteConfirm"
        className="input"
        autoComplete="off"
        spellCheck={false}
        value={typed}
        placeholder={hint}
        onChange={(event) => setTyped(event.target.value)}
        aria-describedby="deleteHelp"
      />
      <p id="deleteHelp" className="deletehelp">
        {email ? <>Bekræftelsen skal være {email}.</> : <>Bekræftelsen skal være SLET.</>}
      </p>
      <div className="accountactions">
        <button type="button" className="btn danger" disabled={!confirmed || busy !== null} onClick={removeAccount}>
          {busy === 'delete' ? 'Sletter…' : 'Slet konto permanent'}
        </button>
      </div>
      {error ? (
        <p className="formerror" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
