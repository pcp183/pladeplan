'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  cabinetFromFields,
  cabinetToParts,
  demoCabinet,
  parseKnownMeasures,
  type CabinetSpec,
} from '@/lib/cabinet-parts';
import { prepareCabinetPhoto } from '@/components/prepare-photo';

type Access = {
  signedIn: boolean;
  allowed: boolean;
  aiReady: boolean;
  code: string;
  demo: boolean;
};

type Step = 'photo' | 'proposal';

const NOT_CONFIGURED = 'Foto-funktionen er ikke sat op endnu.';

const EMPTY_FIELDS = {
  name: 'Skab',
  widthMm: '',
  heightMm: '',
  depthMm: '560',
  thicknessMm: '18',
  sections: '1',
  shelvesPerSection: '1',
  doors: '1',
  drawers: '0',
};

function isPhotoDemo(): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('fotodemo') === '1';
}

function fieldsFromSpec(spec: CabinetSpec) {
  return {
    name: spec.name,
    widthMm: String(spec.widthMm),
    heightMm: String(spec.heightMm),
    depthMm: String(spec.depthMm),
    thicknessMm: String(spec.thicknessMm),
    sections: String(spec.sections),
    shelvesPerSection: String(spec.shelvesPerSection),
    doors: String(spec.doors),
    drawers: String(spec.drawers),
  };
}

export function PhotoCabinet() {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('photo');
  const [access, setAccess] = useState<Access | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [widthMm, setWidthMm] = useState('');
  const [heightMm, setHeightMm] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [fields, setFields] = useState(EMPTY_FIELDS);

  useEffect(() => {
    window.__pladeplanOpenPhoto = () => {
      setStep('photo');
      setError('');
      setNote('');
      setBusy(false);
      setAccess(isPhotoDemo() ? { signedIn: true, allowed: true, aiReady: true, code: 'ok', demo: true } : null);
      setOpen(true);
    };
    return () => {
      delete window.__pladeplanOpenPhoto;
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();
  }, [open]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (isPhotoDemo()) {
      setAccess({ signedIn: true, allowed: true, aiReady: true, code: 'ok', demo: true });
      return;
    }
    setAccess(null);
    void fetch('/api/photo-cabinet', { headers: { accept: 'application/json' } })
      .then(async (response) => {
        const body = (await response.json()) as Partial<Access>;
        if (cancelled) return;
        setAccess({
          signedIn: Boolean(body.signedIn),
          allowed: Boolean(body.allowed),
          aiReady: Boolean(body.aiReady),
          code: typeof body.code === 'string' ? body.code : 'server',
          demo: false,
        });
      })
      .catch(() => {
        if (!cancelled) setError('Fotoet kunne ikke startes. Prøv igen.');
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function close() {
    dialogRef.current?.close();
    setOpen(false);
  }

  function onFile(next: File | null) {
    setFile(next);
    setError('');
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return next ? URL.createObjectURL(next) : '';
    });
  }

  async function propose() {
    setError('');
    const known = parseKnownMeasures({ widthMm, heightMm: heightMm.trim() ? heightMm : null });
    if (!known.ok) {
      setError(known.error);
      return;
    }
    if (access?.demo) {
      const spec = demoCabinet(known.widthMm, known.heightMm);
      const check = cabinetToParts(spec);
      if (!check.ok) {
        setError(check.error);
        return;
      }
      setFields(fieldsFromSpec(spec));
      setNote('Eksempel uden foto-model. Ret målene, før du beregner.');
      setStep('proposal');
      return;
    }
    if (!file) {
      setError('Vælg et foto først.');
      return;
    }
    setBusy(true);
    try {
      const photo = await prepareCabinetPhoto(file);
      const response = await fetch('/api/photo-cabinet', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          mediaType: photo.mediaType,
          imageBase64: photo.base64,
          widthMm: known.widthMm,
          heightMm: known.heightMm,
        }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; code?: string; cabinet?: CabinetSpec; note?: string } | null;
      if (!response.ok || !body?.cabinet) {
        if (body?.code === 'ai_not_configured') setError(NOT_CONFIGURED);
        else setError(body?.error || 'Fotoet kunne ikke læses. Prøv et andet billede.');
        return;
      }
      setFields(fieldsFromSpec(body.cabinet));
      setNote(body.note || 'Forslag ud fra fotoet. Kontrollér målene, før du skærer.');
      setStep('proposal');
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : '';
      setError(reason === 'too_big' ? 'Billedet er for stort. Prøv et mindre foto.' : 'Billedet kunne ikke læses. Brug JPG eller PNG.');
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    setError('');
    const parsed = cabinetFromFields(fields);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const parts = cabinetToParts(parsed.spec);
    if (!parts.ok) {
      setError(parts.error);
      return;
    }
    const replace = window.__pladeplanReplaceParts;
    if (!replace) {
      setError('Planlæggeren er ikke klar. Genindlæs siden.');
      return;
    }
    const ok = replace(
      parts.parts.map((part) => ({ name: part.name, w: part.widthMm, h: part.lengthMm, q: part.qty })),
      parsed.spec.name,
    );
    if (!ok) return;
    close();
  }

  function setField(key: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  const ready = access?.signedIn && access.allowed && (access.aiReady || access.demo);

  return open ? (
    <dialog
      ref={dialogRef}
      id="photoDialog"
      aria-labelledby={titleId}
      onClose={() => setOpen(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="modalhead">
        <div className="modaltitle">
          <div className="aiicon" aria-hidden="true">
            ▣
          </div>
          <div>
            <h2 id={titleId}>Foto til skæreseddel</h2>
            <p>{step === 'proposal' ? 'Ret forslaget, og lav emnelisten.' : 'Et foto og ét kendt mål.'}</p>
          </div>
        </div>
        <button type="button" className="close" onClick={close} aria-label="Luk">
          ×
        </button>
      </div>
      <div className="modalbody">
        {!access && !error ? <p className="photointro">Et øjeblik…</p> : null}
        {!ready && error ? (
          <p className="photoerror" role="alert">
            {error}
          </p>
        ) : null}
        {access && !access.signedIn ? (
          <div className="photogate">
            <p>Log ind for at bruge foto til skæreseddel.</p>
            <p>
              <a href="/sign-in">Log ind</a>
            </p>
          </div>
        ) : null}
        {access?.signedIn && !access.allowed ? (
          <div className="photogate">
            <p>Foto til skæreseddel hører til Pro.</p>
            <p>
              <a href="/konto#abonnement">Se abonnement</a>
            </p>
          </div>
        ) : null}
        {access?.signedIn && access.allowed && !access.aiReady && !access.demo ? (
          <p className="photointro">{NOT_CONFIGURED}</p>
        ) : null}
        {ready && step === 'photo' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void propose();
            }}
          >
            <p className="photointro">Tag et billede af væggen, hvor skabet skal stå, og skriv den bredde, du kender.</p>
            <label className="photopick">
              <span className="label">Foto</span>
              <input
                id="photoFile"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => onFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {preview ? <img className="photopreview" src={preview} alt="Valgt foto af væggen" /> : null}
            <div className="photogrid">
              <div className="field">
                <label className="label" htmlFor="photoWidth">
                  Kendt bredde
                </label>
                <div className="unit">
                  <input
                    className="input"
                    id="photoWidth"
                    inputMode="decimal"
                    value={widthMm}
                    onChange={(event) => setWidthMm(event.target.value)}
                    required
                  />
                  <span>mm</span>
                </div>
              </div>
              <div className="field">
                <label className="label" htmlFor="photoHeight">
                  Højde <em>valgfri</em>
                </label>
                <div className="unit">
                  <input
                    className="input"
                    id="photoHeight"
                    inputMode="decimal"
                    value={heightMm}
                    onChange={(event) => setHeightMm(event.target.value)}
                  />
                  <span>mm</span>
                </div>
              </div>
            </div>
            <p className="photohint">Billedet bruges kun til forslaget og gemmes ikke. Prisen kommer fra butikslisten bagefter, ikke fra fotoet.</p>
            {error ? (
              <p className="photoerror" role="alert">
                {error}
              </p>
            ) : null}
            <div className="photoactions">
              <button className="btn primary" id="photoPropose" type="submit" disabled={busy}>
                {busy ? 'Læser fotoet…' : 'Foreslå skab'}
              </button>
            </div>
          </form>
        ) : null}
        {ready && step === 'proposal' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              apply();
            }}
          >
            {note ? <p className="photonote">{note}</p> : null}
            <div className="field">
              <label className="label" htmlFor="cabinetName">
                Navn
              </label>
              <input className="input" id="cabinetName" value={fields.name} maxLength={60} onChange={(event) => setField('name', event.target.value)} />
            </div>
            <div className="photogrid">
              <Measure id="cabinetWidth" label="Bredde" value={fields.widthMm} onChange={(value) => setField('widthMm', value)} />
              <Measure id="cabinetHeight" label="Højde" value={fields.heightMm} onChange={(value) => setField('heightMm', value)} />
              <Measure id="cabinetDepth" label="Dybde" value={fields.depthMm} onChange={(value) => setField('depthMm', value)} />
              <Measure id="cabinetThickness" label="Tykkelse" value={fields.thicknessMm} onChange={(value) => setField('thicknessMm', value)} />
              <Measure id="cabinetSections" label="Fag" value={fields.sections} onChange={(value) => setField('sections', value)} />
              <Measure id="cabinetShelves" label="Hylder pr. fag" value={fields.shelvesPerSection} onChange={(value) => setField('shelvesPerSection', value)} />
              <Measure id="cabinetDoors" label="Låger" value={fields.doors} onChange={(value) => setField('doors', value)} />
              <Measure id="cabinetDrawers" label="Skuffer" value={fields.drawers} onChange={(value) => setField('drawers', value)} />
            </div>
            <p className="photohint">
              Siderne går i fuld højde. Top og bund sidder imellem. Ryggen er samme plade og tæller med i dybden. Hylderne gentages i hvert fag.
              Låger dækker forsiden med 2 mm luft imellem. Skuffer er fronter nederst.
            </p>
            {error ? (
              <p className="photoerror" role="alert">
                {error}
              </p>
            ) : null}
            <div className="photoactions">
              <button className="btn" type="button" onClick={() => { setError(''); setStep('photo'); }}>
                Tilbage
              </button>
              <button className="btn primary" id="cabinetApply" type="submit">
                Lav emneliste og beregn
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </dialog>
  ) : null;
}

function Measure({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="unit">
        <input className="input" id={id} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} />
        <span>{id === 'cabinetSections' || id === 'cabinetShelves' || id === 'cabinetDoors' || id === 'cabinetDrawers' ? 'stk' : 'mm'}</span>
      </div>
    </div>
  );
}
