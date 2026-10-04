import assert from 'node:assert/strict';
import { confirmationMatches } from '../lib/confirm.ts';
import { parseProject, parseProjectList } from '../lib/project-record.ts';

const project = parseProject({
  id: 'p-123',
  n: 'Køkken',
  m: 1,
  w: '1220',
  h: '2440',
  k: '3.2',
  t: '10',
  r: true,
  p: [
    ['Side', '580', '720', '2'],
    ['Bund', 564, 580, 1],
  ],
  updatedAt: '2026-09-26T12:00:00.000Z',
});

assert.ok(project);
assert.equal(project.n, 'Køkken');
assert.equal(project.m, 1);
assert.equal(project.mid, undefined);
assert.equal(project.pr, undefined);
assert.deepEqual(project.p[1], ['Bund', '564', '580', '1']);

const withPlate = parseProject({
  id: 'p-melamin',
  n: 'Hvide skabe',
  m: 25,
  mid: 'melamin-18-2070x2800',
  pr: '275,50',
  w: '2070',
  h: '2800',
  p: [],
  updatedAt: '2026-09-26T12:00:00.000Z',
});
assert.ok(withPlate);
assert.equal(withPlate.m, 25);
assert.equal(withPlate.mid, 'melamin-18-2070x2800');
assert.equal(withPlate.pr, '275,50');
assert.equal(withPlate.px, undefined);

const withPrices = parseProject({
  id: 'p-priser',
  n: 'Priser',
  m: 4,
  mid: 'mdf-19-1220x2440',
  pr: '320',
  px: {
    'mdf-19-1220x2440': '320',
    'mdf-19-2070x2800': '610,50',
    '<bad>': '100',
    custom: 'ikke',
    'birk-18-1220x2440': '400',
  },
  p: [],
  updatedAt: '2026-10-02T12:00:00.000Z',
});
assert.ok(withPrices);
assert.deepEqual(withPrices.px, {
  'mdf-19-1220x2440': '320',
  'mdf-19-2070x2800': '610,50',
  'birk-18-1220x2440': '400',
});

const rejectedPlate = parseProject({
  id: 'p-bad-plate',
  n: 'x',
  m: 81,
  mid: '<script>',
  pr: 'ikke-en-pris',
  p: [],
  updatedAt: '2026-09-26T12:00:00.000Z',
});
assert.ok(rejectedPlate);
assert.equal(rejectedPlate.m, 0);
assert.equal(rejectedPlate.mid, undefined);
assert.equal(rejectedPlate.pr, undefined);

assert.equal(parseProject({ id: '../etc', n: 'x' }), null);
assert.equal(parseProject({ id: '', n: 'x' }), null);

const list = parseProjectList({
  projects: [
    { id: 'b', n: 'Senere', updatedAt: '2026-09-26T10:00:00.000Z', p: [] },
    { id: 'a', n: 'Først', updatedAt: '2026-09-26T12:00:00.000Z', p: [] },
    { id: 'a', n: 'Først igen', updatedAt: '2026-09-26T13:00:00.000Z', p: [] },
  ],
});
assert.ok(!('error' in list));
if ('projects' in list) {
  assert.deepEqual(
    list.projects.map((item) => item.id),
    ['a', 'b'],
  );
  assert.equal(list.projects[0].n, 'Først igen');
}

assert.equal('error' in parseProjectList({ projects: [{ id: 'bad id' }] }), true);
assert.equal(confirmationMatches('Peter@Example.com', ' peter@example.com '), true);
assert.equal(confirmationMatches('peter@example.com', 'anden@example.com'), false);
const withOwn = parseProject({
  id: 'p-own',
  n: 'Valnød',
  m: 40,
  mid: 'own-valnod',
  w: '800',
  h: '2200',
  os: { id: 'own-valnod', name: 'Valnød', thick: 18, w: 800, h: 2200, price: '640,50' },
  sheets: [
    { id: 'own-valnod', name: 'Valnød', thick: 18, w: 800, h: 2200, price: 640.5 },
    { id: 'shop', name: 'Silvan', thick: 19, w: 1220, h: 2440, price: 10 },
    { id: 'own-bad', name: '', thick: 18, w: 10, h: 10, price: 10 },
  ],
  p: [],
  updatedAt: '2026-10-04T12:00:00.000Z',
});
assert.ok(withOwn);
assert.equal(withOwn.mid, 'own-valnod');
assert.deepEqual(withOwn.os, { id: 'own-valnod', name: 'Valnød', thick: 18, w: 800, h: 2200, price: 640.5 });
assert.deepEqual(withOwn.sheets, [{ id: 'own-valnod', name: 'Valnød', thick: 18, w: 800, h: 2200, price: 640.5 }]);

assert.equal(confirmationMatches(null, 'SLET'), true);
assert.equal(confirmationMatches(null, 'slet'), false);
console.log('projects ok');
