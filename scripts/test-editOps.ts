/**
 * Hand-written tests for the edit-ops reducer + history (STEP 1, no AI).
 * Run: npx tsx scripts/test-editOps.ts
 */
import assert from 'node:assert/strict';
import { templateById } from '../src/data/templates';
import { defaultSpecFromTemplate } from '../src/lib/builder/spec';
import { applyOps, applyOpsFromUnknown, type EditOp } from '../src/lib/editOps';
import { createHistory, commit, undo, redo, canUndo, canRedo } from '../src/lib/specHistory';

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n      ${(e as Error).message.split('\n')[0]}`);
  }
}
// invalid ops are cast through unknown on purpose (they're what the AI might emit)
const bad = (o: unknown) => o as unknown as EditOp;

const tpl = templateById('restaurant')!;
const base = () => defaultSpecFromTemplate(tpl);
const ids = (s = base()) => s.sections.map((x) => x.id);
// restaurant section ids: hero, features, gallery, about, contact

console.log('edit-ops reducer');

test('applies a valid setText', () => {
  const r = applyOps(base(), [{ op: 'setText', sectionId: 'hero', slotId: 'headline', value: 'A new headline' }]);
  assert.equal(r.applied.length, 1);
  assert.equal(r.skipped.length, 0);
  assert.equal(r.next.sections.find((s) => s.id === 'hero')!.text.headline, 'A new headline');
});

test('applies a valid setTheme', () => {
  const r = applyOps(base(), [{ op: 'setTheme', value: 'mono' }]);
  assert.equal(r.applied.length, 1);
  assert.equal(r.next.theme, 'mono');
});

test('applies a valid setSiteName / setTagline / setFont / setAnimation', () => {
  const r = applyOps(base(), [
    { op: 'setSiteName', value: 'Osteria' },
    { op: 'setTagline', value: 'Since forever' },
    { op: 'setFont', value: 'mono' },
    { op: 'setAnimation', value: 'none' },
  ]);
  assert.equal(r.applied.length, 4);
  assert.equal(r.next.meta.siteName, 'Osteria');
  assert.equal(r.next.meta.tagline, 'Since forever');
  assert.equal(r.next.font, 'mono');
  assert.equal(r.next.animation, 'none');
});

test('applies a valid toggleSection (toggleable section)', () => {
  const r = applyOps(base(), [{ op: 'toggleSection', sectionId: 'features', enabled: false }]);
  assert.equal(r.applied.length, 1);
  assert.equal(r.next.sections.find((s) => s.id === 'features')!.enabled, false);
});

test('applies a valid reorderSection', () => {
  const r = applyOps(base(), [{ op: 'reorderSection', sectionId: 'gallery', toIndex: 0 }]);
  assert.equal(r.applied.length, 1);
  assert.deepStrictEqual(r.next.sections.map((s) => s.id), ['gallery', 'hero', 'features', 'about', 'contact']);
  // same set of sections, just reordered
  assert.deepStrictEqual([...ids(r.next)].sort(), [...ids()].sort());
});

test('applies a valid setImagePreset (preset only, keeps label/alt)', () => {
  const before = base().sections.find((s) => s.id === 'hero')!.images.media;
  const r = applyOps(base(), [{ op: 'setImagePreset', sectionId: 'hero', slotId: 'media', presetId: 'mono' }]);
  const after = r.next.sections.find((s) => s.id === 'hero')!.images.media;
  assert.equal(r.applied.length, 1);
  assert.equal(after.presetId, 'mono');
  assert.equal(after.label, before.label); // description preserved
  assert.equal(after.alt, before.alt);
});

console.log('rejections (skipped + reported, never fatal)');

test('rejects setText to a nonexistent slot', () => {
  const r = applyOps(base(), [{ op: 'setText', sectionId: 'hero', slotId: 'nope', value: 'x' }]);
  assert.equal(r.applied.length, 0);
  assert.equal(r.skipped.length, 1);
  assert.match(r.skipped[0].reason, /not a text slot/);
});

test('rejects setText over slot maxLen', () => {
  const tooLong = 'x'.repeat(200); // hero.headline maxLen is 64
  const r = applyOps(base(), [{ op: 'setText', sectionId: 'hero', slotId: 'headline', value: tooLong }]);
  assert.equal(r.applied.length, 0);
  assert.match(r.skipped[0].reason, /exceeds slot/);
});

test('rejects setTheme to an invalid enum', () => {
  const r = applyOps(base(), [bad({ op: 'setTheme', value: 'neon' })]);
  assert.equal(r.applied.length, 0);
  assert.match(r.skipped[0].reason, /invalid theme/);
});

test('rejects toggleSection on a non-toggleable section', () => {
  const r = applyOps(base(), [{ op: 'toggleSection', sectionId: 'hero', enabled: false }]);
  assert.equal(r.applied.length, 0);
  assert.match(r.skipped[0].reason, /not toggleable/);
});

test('rejects reorderSection out of range', () => {
  const r = applyOps(base(), [{ op: 'reorderSection', sectionId: 'hero', toIndex: 99 }]);
  assert.equal(r.applied.length, 0);
  assert.match(r.skipped[0].reason, /out of range/);
});

test('rejects setImagePreset with an unknown preset / non-image slot', () => {
  const r = applyOps(base(), [
    { op: 'setImagePreset', sectionId: 'hero', slotId: 'media', presetId: 'does-not-exist' },
    { op: 'setImagePreset', sectionId: 'features', slotId: 'title', presetId: 'mono' }, // features has no image slots
  ]);
  assert.equal(r.applied.length, 0);
  assert.equal(r.skipped.length, 2);
  assert.match(r.skipped[0].reason, /unknown image preset/);
  assert.match(r.skipped[1].reason, /not an image slot/);
});

test('rejects malformed ops (zod shape) — missing field & unknown extra field', () => {
  const r = applyOps(base(), [
    bad({ op: 'setText', sectionId: 'hero' }), // missing slotId + value
    bad({ op: 'setTheme', value: 'mono', extra: 1 }), // strict: no extra fields
    bad({ op: 'frobnicate', sectionId: 'hero' }), // unknown op
  ]);
  assert.equal(r.applied.length, 0);
  assert.equal(r.skipped.length, 3);
  r.skipped.forEach((s) => assert.match(s.reason, /malformed op/));
});

test('a single bad op does not break the batch (others still apply, in order)', () => {
  const r = applyOps(base(), [
    { op: 'setTheme', value: 'mono' }, // valid
    { op: 'setText', sectionId: 'hero', slotId: 'nope', value: 'x' }, // invalid -> skipped
    { op: 'setSiteName', value: 'Osteria' }, // valid
  ]);
  assert.equal(r.applied.length, 2);
  assert.equal(r.skipped.length, 1);
  assert.equal(r.next.theme, 'mono');
  assert.equal(r.next.meta.siteName, 'Osteria');
});

console.log('immutability');

test('applyOps never mutates the input spec', () => {
  const spec = base();
  const snapshot = structuredClone(spec);
  applyOps(spec, [
    { op: 'setTheme', value: 'mono' },
    { op: 'setText', sectionId: 'hero', slotId: 'headline', value: 'changed' },
    { op: 'reorderSection', sectionId: 'gallery', toIndex: 0 },
    { op: 'toggleSection', sectionId: 'features', enabled: false },
    { op: 'setImagePreset', sectionId: 'hero', slotId: 'media', presetId: 'mono' },
  ]);
  assert.deepStrictEqual(spec, snapshot); // original untouched
});

console.log('undo / redo history');

test('undo() then redo() round-trips the spec exactly', () => {
  const spec = base();
  let h = createHistory(spec);
  assert.equal(canUndo(h), false);

  const c = commit(h, [{ op: 'setTheme', value: 'mono' }, { op: 'setSiteName', value: 'Osteria' }]);
  h = c.history;
  assert.equal(c.result.applied.length, 2);
  assert.equal(h.present.theme, 'mono');
  assert.equal(canUndo(h), true);
  const committed = structuredClone(h.present);

  h = undo(h);
  assert.deepStrictEqual(h.present, spec); // exactly back to the start
  assert.equal(canRedo(h), true);

  h = redo(h);
  assert.deepStrictEqual(h.present, committed); // exactly forward again
});

test('a no-op commit (all skipped) does not add a history step', () => {
  const spec = base();
  let h = createHistory(spec);
  const c = commit(h, [{ op: 'setText', sectionId: 'hero', slotId: 'nope', value: 'x' }]);
  h = c.history;
  assert.equal(c.result.skipped.length, 1);
  assert.equal(canUndo(h), false);
  assert.deepStrictEqual(h.present, spec);
});

test('history is capped at HISTORY_CAP', () => {
  let h = createHistory(base());
  for (let i = 0; i < 60; i++) h = commit(h, [{ op: 'setSiteName', value: `Name ${i}` }]).history;
  assert.equal(h.past.length, 50);
  assert.equal(h.present.meta.siteName, 'Name 59');
});

console.log('no-op detection (valid but changes nothing)');

test('no-op reorder (toIndex === current) is skipped, not applied — no ghost history', () => {
  const r = applyOps(base(), [{ op: 'reorderSection', sectionId: 'hero', toIndex: 0 }]); // hero is already first
  assert.equal(r.applied.length, 0);
  assert.equal(r.skipped.length, 1);
  assert.match(r.skipped[0].reason, /no change/);
  // and through history: no step recorded
  const c = commit(createHistory(base()), [{ op: 'reorderSection', sectionId: 'hero', toIndex: 0 }]);
  assert.equal(canUndo(c.history), false);
});

test('setting a value to its current value is a no-op (skipped)', () => {
  const spec = base(); // restaurant theme is "warm"
  const r = applyOps(spec, [{ op: 'setTheme', value: spec.theme }, { op: 'setSiteName', value: spec.meta.siteName }]);
  assert.equal(r.applied.length, 0);
  assert.equal(r.skipped.length, 2);
  r.skipped.forEach((s) => assert.match(s.reason, /no change/));
});

console.log('setImageDesc (the description = the real signal EAL receives)');

test('applies a valid setImageDesc (sets label + alt)', () => {
  const r = applyOps(base(), [{ op: 'setImageDesc', sectionId: 'hero', slotId: 'media', label: 'A bowl of fresh tagliatelle' }]);
  const media = r.next.sections.find((s) => s.id === 'hero')!.images.media;
  assert.equal(r.applied.length, 1);
  assert.equal(media.label, 'A bowl of fresh tagliatelle');
  assert.equal(media.alt, 'A bowl of fresh tagliatelle');
});

test('rejects setImageDesc over the label max + on a non-image slot', () => {
  const r = applyOps(base(), [
    { op: 'setImageDesc', sectionId: 'hero', slotId: 'media', label: 'x'.repeat(80) },
    { op: 'setImageDesc', sectionId: 'features', slotId: 'title', label: 'nope' },
  ]);
  assert.equal(r.applied.length, 0);
  assert.match(r.skipped[0].reason, /exceeds/);
  assert.match(r.skipped[1].reason, /not an image slot/);
});

console.log('meta length rejection + ghost-section guard');

test('rejects setSiteName > 60 and setTagline > 120', () => {
  const r = applyOps(base(), [
    { op: 'setSiteName', value: 'n'.repeat(61) },
    { op: 'setTagline', value: 't'.repeat(121) },
  ]);
  assert.equal(r.applied.length, 0);
  assert.match(r.skipped[0].reason, /siteName length/);
  assert.match(r.skipped[1].reason, /tagline length/);
});

test('rejects reorder of a section that exists in the spec but not the template', () => {
  const spec = base();
  const ghost = { ...spec, sections: [...spec.sections, { id: 'ghost', enabled: true, text: {}, images: {} }] };
  const r = applyOps(ghost, [{ op: 'reorderSection', sectionId: 'ghost', toIndex: 0 }]);
  assert.equal(r.applied.length, 0);
  assert.match(r.skipped[0].reason, /unknown section/);
});

console.log('history — deeper invariants');

test('N-deep undo then N-deep redo round-trips exactly', () => {
  const spec = base();
  let h = createHistory(spec);
  const snaps = [structuredClone(spec)];
  for (const v of ['mono', 'indigo', 'dark'] as const) {
    h = commit(h, [{ op: 'setTheme', value: v }]).history;
    snaps.push(structuredClone(h.present));
  }
  for (let i = 0; i < 3; i++) h = undo(h);
  assert.deepStrictEqual(h.present, spec); // all the way back
  for (let i = 0; i < 3; i++) h = redo(h);
  assert.deepStrictEqual(h.present, snaps[3]); // all the way forward
});

test('a new commit clears the redo future', () => {
  let h = createHistory(base());
  h = commit(h, [{ op: 'setTheme', value: 'mono' }]).history;
  h = undo(h);
  assert.equal(canRedo(h), true);
  h = commit(h, [{ op: 'setTheme', value: 'dark' }]).history;
  assert.equal(canRedo(h), false);
  assert.equal(h.present.theme, 'dark');
});

test('commit/undo/redo never mutate earlier history snapshots', () => {
  const spec = base();
  let h = createHistory(spec);
  h = commit(h, [{ op: 'setSiteName', value: 'A' }]).history;
  const pastSnap = structuredClone(h.past);
  h = commit(h, [{ op: 'setSiteName', value: 'B' }]).history;
  h = undo(h);
  h = redo(h);
  assert.deepStrictEqual(h.past[0], pastSnap[0]); // original snapshot untouched
});

console.log('applyOpsFromUnknown (untrusted envelope entry point for step 2)');

test('applyOpsFromUnknown applies a well-formed envelope', () => {
  const r = applyOpsFromUnknown(base(), { ops: [{ op: 'setTheme', value: 'mono' }] });
  assert.equal(r.applied.length, 1);
  assert.equal(r.next.theme, 'mono');
});

test('applyOpsFromUnknown rejects a malformed envelope (not {ops:[]} / extra keys)', () => {
  const r1 = applyOpsFromUnknown(base(), { nope: true });
  const r2 = applyOpsFromUnknown(base(), { ops: [], extra: 1 }); // strict envelope
  const r3 = applyOpsFromUnknown(base(), 'garbage');
  [r1, r2, r3].forEach((r) => {
    assert.equal(r.applied.length, 0);
    assert.equal(r.skipped.length, 1);
    assert.match(r.skipped[0].reason, /malformed ops payload/);
  });
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
