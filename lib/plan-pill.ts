function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttr(value: string): string {
  return escapeText(value).replaceAll('"', '&quot;');
}

const PILL_RE = /<(?:span|a) class="planpill[^"]*"[\s\S]*?<\/(?:span|a)>/;

/** Swap the planner header pill. Packing markup around it stays as-is. */
export function applyPlanPill(markup: string, pill: { text: string; title: string; pro?: boolean }): string {
  const cls = pill.pro ? 'planpill pro' : 'planpill';
  const next = `<a class="${cls}" id="planPill" href="/konto#abonnement" title="${escapeAttr(pill.title)}">${escapeText(pill.text)}</a>`;
  if (!PILL_RE.test(markup)) return markup;
  return markup.replace(PILL_RE, next);
}
