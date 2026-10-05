import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  applyKnownMeasures,
  cabinetFromFields,
  cabinetToParts,
  demoCabinet,
  FRONT_GAP_MM,
  parseKnownMeasures,
  type CutPart,
} from '../lib/cabinet-parts.ts';
import { PLANNER_MARKUP } from '../lib/planner-markup.ts';

function part(parts: CutPart[], name: string): CutPart {
  const found = parts.filter((item) => item.name === name);
  assert.equal(found.length, 1, name);
  return found[0];
}

function fits(width: number, length: number): boolean {
  const usableW = 1220 - 20;
  const usableH = 2440 - 20;
  return (width <= usableW && length <= usableH) || (length <= usableW && width <= usableH);
}

const single = cabinetToParts({
  name: 'Skab',
  widthMm: 600,
  heightMm: 720,
  depthMm: 500,
  thicknessMm: 18,
  sections: 1,
  shelvesPerSection: 2,
  doors: 1,
  drawers: 0,
});
assert.equal(single.ok, true);
if (single.ok) {
  assert.deepEqual(part(single.parts, 'Side'), { name: 'Side', widthMm: 482, lengthMm: 720, qty: 2 });
  assert.deepEqual(part(single.parts, 'Top'), { name: 'Top', widthMm: 482, lengthMm: 564, qty: 1 });
  assert.deepEqual(part(single.parts, 'Bund'), { name: 'Bund', widthMm: 482, lengthMm: 564, qty: 1 });
  assert.equal(single.parts.some((item) => item.name === 'Mellemstykke'), false);
  assert.deepEqual(part(single.parts, 'Hylde'), { name: 'Hylde', widthMm: 482, lengthMm: 564, qty: 2 });
  assert.deepEqual(part(single.parts, 'Ryg'), { name: 'Ryg', widthMm: 600, lengthMm: 720, qty: 1 });
  assert.deepEqual(part(single.parts, 'Låge'), { name: 'Låge', widthMm: 600, lengthMm: 720, qty: 1 });
  assert.equal(single.parts.some((item) => item.name === 'Skuffefront'), false);
  assert.equal(JSON.stringify(single.parts).includes('pris'), false);
}

const mixed = cabinetToParts({
  name: 'Skab',
  widthMm: 900,
  heightMm: 700,
  depthMm: 400,
  thicknessMm: 18,
  sections: 2,
  shelvesPerSection: 1,
  doors: 2,
  drawers: 1,
});
assert.equal(mixed.ok, true);
if (mixed.ok) {
  assert.equal(FRONT_GAP_MM, 2);
  assert.deepEqual(part(mixed.parts, 'Mellemstykke'), { name: 'Mellemstykke', widthMm: 382, lengthMm: 664, qty: 1 });
  assert.deepEqual(part(mixed.parts, 'Hylde'), { name: 'Hylde', widthMm: 382, lengthMm: 423, qty: 2 });
  assert.deepEqual(part(mixed.parts, 'Låge'), { name: 'Låge', widthMm: 449, lengthMm: 349, qty: 2 });
  assert.deepEqual(part(mixed.parts, 'Skuffefront'), { name: 'Skuffefront', widthMm: 900, lengthMm: 349, qty: 1 });
}

const drawersOnly = cabinetToParts({
  name: 'Skab',
  widthMm: 600,
  heightMm: 400,
  depthMm: 300,
  thicknessMm: 18,
  sections: 1,
  shelvesPerSection: 0,
  doors: 0,
  drawers: 2,
});
assert.equal(drawersOnly.ok, true);
if (drawersOnly.ok) {
  assert.equal(drawersOnly.parts.some((item) => item.name === 'Hylde' || item.name === 'Låge'), false);
  assert.deepEqual(part(drawersOnly.parts, 'Skuffefront'), { name: 'Skuffefront', widthMm: 600, lengthMm: 199, qty: 2 });
}

const tooShallow = cabinetToParts({
  name: 'Skab',
  widthMm: 600,
  heightMm: 720,
  depthMm: 18,
  thicknessMm: 18,
  sections: 1,
  shelvesPerSection: 0,
  doors: 0,
  drawers: 0,
});
assert.equal(tooShallow.ok, false);

const crowded = cabinetToParts({
  name: 'Skab',
  widthMm: 200,
  heightMm: 400,
  depthMm: 200,
  thicknessMm: 40,
  sections: 8,
  shelvesPerSection: 0,
  doors: 0,
  drawers: 0,
});
assert.equal(crowded.ok, false);

const fromFields = cabinetFromFields({
  name: '  ',
  widthMm: '800',
  heightMm: '720',
  depthMm: '560',
  thicknessMm: '18,5',
  sections: '1',
  shelvesPerSection: '0',
  doors: '1',
  drawers: '0',
});
assert.equal(fromFields.ok, true);
if (fromFields.ok) {
  assert.equal(fromFields.spec.name, 'Skab');
  assert.equal(fromFields.spec.thicknessMm, 18.5);
  const cut = cabinetToParts(fromFields.spec);
  assert.equal(cut.ok, true);
  if (cut.ok) assert.equal(part(cut.parts, 'Side').widthMm, 541.5);
}

assert.equal(cabinetFromFields({
  name: 'Skab',
  widthMm: '800',
  heightMm: '720',
  depthMm: '560',
  thicknessMm: '18',
  sections: '1,5',
  shelvesPerSection: '1',
  doors: '1',
  drawers: '0',
}).ok, false);

const known = parseKnownMeasures({ widthMm: '2400', heightMm: '' });
assert.equal(known.ok, true);
if (known.ok) {
  assert.equal(known.widthMm, 2400);
  assert.equal(known.heightMm, null);
  const forced = applyKnownMeasures(
    { name: 'Skab', heightMm: 900, depthMm: 400, thicknessMm: 18, sections: 1, shelvesPerSection: 0, doors: 0, drawers: 0 },
    known,
  );
  assert.equal(forced.widthMm, 2400);
  assert.equal(forced.heightMm, 900);
}
const withHeight = parseKnownMeasures({ widthMm: 2400, heightMm: 2100 });
assert.equal(withHeight.ok, true);
if (withHeight.ok) assert.equal(withHeight.heightMm, 2100);
assert.equal(parseKnownMeasures({ widthMm: 'nej', heightMm: null }).ok, false);

const demo = cabinetToParts(demoCabinet(2400, null));
assert.equal(demo.ok, true);
if (demo.ok) {
  assert.equal(part(demo.parts, 'Mellemstykke').qty, 2);
  assert.equal(part(demo.parts, 'Hylde').qty, 3);
  assert.equal(part(demo.parts, 'Låge').qty, 3);
  assert.equal(part(demo.parts, 'Låge').widthMm, 798.7);
  assert.equal(demo.parts.every((item) => fits(item.widthMm, item.lengthMm)), true);
}

assert.match(PLANNER_MARKUP, /id="dictateParts"/);
assert.match(PLANNER_MARKUP, /aria-label="Dikter emner"/);
assert.match(PLANNER_MARKUP, />Tal emnerne</);
assert.match(PLANNER_MARKUP, /Tal, skriv eller indsæt tekst, og kontrollér emnelisten/);
assert.match(PLANNER_MARKUP, /Stemme virker i Chrome, Edge og Safari/);
const voiceJs = readFileSync(new URL('../public/planner.js', import.meta.url), 'utf8');
assert.match(voiceJs, /webkitSpeechRecognition/);
assert.match(voiceJs, /da-DK/);
assert.match(voiceJs, /Mikrofonen er blokeret/);
assert.equal(voiceJs.includes('onend=()=>analyze'), false);
assert.equal(voiceJs.includes('finishVoice(){analyze'), false);

assert.match(PLANNER_MARKUP, /id="openPhoto"/);
assert.match(PLANNER_MARKUP, /Fra foto/);
assert.match(PLANNER_MARKUP, /protag">Pro</);

const route = readFileSync(new URL('../app/api/photo-cabinet/route.ts', import.meta.url), 'utf8');
const vision = readFileSync(new URL('../lib/photo-vision.ts', import.meta.url), 'utf8');
assert.match(route, /ai_not_configured/);
assert.match(route, /Foto-funktionen er ikke sat op endnu/);
assert.match(vision, /Output\.object/);
assert.match(vision, /Nævn aldrig pris/);
assert.equal(vision.includes('price'), false);

console.log('cabinet parts tests ok');
