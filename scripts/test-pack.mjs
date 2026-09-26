import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/planner.js', import.meta.url), 'utf8');
const chunk = source.match(/const SORTS=\[[\s\S]*?\nfunction pack\([\s\S]*?\n\}/);
if (!chunk) throw new Error('Kunne ikke finde pack() i public/planner.js');

const context = { dim: (n) => String(n) };
vm.createContext(context);
vm.runInContext(`${chunk[0]}\nthis.pack = pack;`, context);

function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function assertPlan(parts, W, H, k, t, rot, label) {
  const sheets = context.pack(parts, W, H, k, t, rot);
  if (!Array.isArray(sheets) || !sheets.length) throw new Error(`${label}: ingen plader`);
  const placed = [];
  for (const sheet of sheets) {
    for (const piece of sheet.pieces) {
      if (piece.x < t - 1e-6 || piece.y < t - 1e-6) throw new Error(`${label}: emne uden for kantfraskær`);
      if (piece.x + piece.w > W - t + 1e-6 || piece.y + piece.h > H - t + 1e-6) {
        throw new Error(`${label}: emne uden for pladen`);
      }
      placed.push(piece);
    }
    for (let i = 0; i < sheet.pieces.length; i++) {
      for (let j = i + 1; j < sheet.pieces.length; j++) {
        if (overlaps(sheet.pieces[i], sheet.pieces[j])) throw new Error(`${label}: overlap`);
      }
    }
  }
  if (placed.length !== parts.length) throw new Error(`${label}: antal emner stemmer ikke`);
  return sheets;
}

const side = { name: 'Side', w: 580, h: 720 };
const base = { name: 'Bund', w: 564, h: 580 };
const shelf = { name: 'Hylde', w: 564, h: 560 };
const standard = [side, side, base, shelf, shelf, shelf];
const standardSheets = assertPlan(standard, 1220, 2440, 3.2, 10, true, 'standard');
const fingerprint = standardSheets.map((sheet) =>
  sheet.pieces.map((piece) => [piece.name, piece.x, piece.y, piece.w, piece.h, piece.turn]),
);
const expected = JSON.parse(fs.readFileSync(new URL('./pack-standard.json', import.meta.url), 'utf8'));
if (JSON.stringify(fingerprint) !== JSON.stringify(expected)) {
  throw new Error('Standardplanen afviger fra pack-standard.json');
}

let fuzz = 0;
for (let n = 0; n < 200; n++) {
  const parts = [];
  const count = 1 + (n % 12);
  for (let i = 0; i < count; i++) {
    const w = 80 + ((n * 17 + i * 53) % 500);
    const h = 60 + ((n * 29 + i * 41) % 700);
    parts.push({ name: `E${i}`, w, h });
  }
  const rot = n % 2 === 0;
  try {
    assertPlan(parts, 1220, 2440, 3.2, 10, rot, `fuzz ${n}`);
    fuzz++;
  } catch (error) {
    if (String(error.message).includes('for stort')) continue;
    throw error;
  }
}
if (fuzz < 150) throw new Error(`For få gyldige fuzz-planer: ${fuzz}`);

let tooBig = false;
try {
  context.pack([{ name: 'Kæmpe', w: 3000, h: 3000 }], 1220, 2440, 3.2, 10, true);
} catch (error) {
  tooBig = /for stort/.test(String(error.message));
}
if (!tooBig) throw new Error('For stort emne skulle afvises');

console.log(`pack ok · standard ${standardSheets.length} plade(r) · fuzz ${fuzz}`);
