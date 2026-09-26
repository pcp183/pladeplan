import assert from 'node:assert/strict';
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
assert.deepEqual(project.p[1], ['Bund', '564', '580', '1']);

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
console.log('projects ok');
