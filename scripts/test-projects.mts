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
assert.equal(confirmationMatches(null, 'SLET'), true);
assert.equal(confirmationMatches(null, 'slet'), false);
console.log('projects ok');
