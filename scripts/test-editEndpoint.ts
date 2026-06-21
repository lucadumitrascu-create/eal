/**
 * Tests for the /api/edit step-2 plumbing (no network).
 * Run: npx tsx scripts/test-editEndpoint.ts
 *
 * The actual NVIDIA call is the only un-testable-here part; everything around it
 * — prompt building, defensive output parsing, the untrusted-model -> applyOps
 * boundary, and the endpoint's validation/fallback/guard paths — is covered.
 */
import assert from 'node:assert/strict';

// Ensure the no-key fallback path (don't make a real network call from tests).
delete process.env.NVIDIA_API_KEY;

import { templateById } from '../src/data/templates';
import { defaultSpecFromTemplate, validateSpec } from '../src/lib/builder/spec';
import { buildEditMessages, specSummary, parseModelPatch } from '../src/lib/ai/editPrompt';
import { applyOps, type EditOp } from '../src/lib/editOps';
import { POST, GET } from '../src/pages/api/edit';

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed++; console.log(`  ✓ ${name}`); })
    .catch((e) => { failed++; console.log(`  ✗ ${name}\n      ${(e as Error).message.split('\n')[0]}`); });
}

const tpl = templateById('restaurant')!;
const base = () => defaultSpecFromTemplate(tpl);

async function run() {
  console.log('prompt building');

  await test('buildEditMessages embeds the closed vocabulary, enums, presets + the user message', () => {
    const [sys, usr] = buildEditMessages(base(), 'make it blue and hide the gallery');
    assert.equal(sys.role, 'system');
    for (const op of ['setText', 'setTheme', 'toggleSection', 'reorderSection', 'setImagePreset', 'setImageDesc']) {
      assert.ok(sys.content.includes(op), `system prompt missing ${op}`);
    }
    assert.ok(sys.content.includes('warm') && sys.content.includes('editorial') && sys.content.includes('terracotta'), 'missing enum/preset lists');
    assert.equal(usr.role, 'user');
    assert.ok(usr.content.includes('USER REQUEST: make it blue and hide the gallery'));
  });

  await test('buildEditMessages interleaves conversation history between system and the new request', () => {
    const history = [
      { role: 'user' as const, content: 'make the text italian mafia style' },
      { role: 'assistant' as const, content: 'Which sections would you like me to change?' },
    ];
    const msgs = buildEditMessages(base(), 'all of them', history);
    assert.equal(msgs.length, 4); // system + 2 history + user
    assert.equal(msgs[0].role, 'system');
    assert.deepEqual({ role: msgs[1].role, content: msgs[1].content }, history[0]);
    assert.equal(msgs[2].role, 'assistant');
    assert.equal(msgs[3].role, 'user');
    assert.ok(msgs[3].content.includes('USER REQUEST: all of them'));
    // no history -> just system + user
    assert.equal(buildEditMessages(base(), 'hi').length, 2);
  });

  await test('buildEditMessages makes the SITE language authoritative for non-English', () => {
    const en = buildEditMessages(base(), 'shorter');
    assert.ok(!en[en.length - 1].content.includes('LANGUAGE:'), 'EN should not force a language');
    const ro = buildEditMessages(base(), 'shorter', [], 'ro');
    assert.ok(ro[ro.length - 1].content.includes('Romanian'), 'RO directive missing');
  });

  await test('specSummary exposes section ids, toggleable flags, slot maxLens + current values', () => {
    const s = specSummary(base());
    assert.ok(s.includes('template "restaurant"'));
    assert.ok(s.includes('hero (hero, enabled, locked)')); // hero not toggleable
    assert.ok(s.includes('features (features, enabled, toggleable)'));
    assert.ok(s.includes('headline(<='), 'missing slot maxLen');
    assert.ok(s.includes('"Taste the tradition"'), 'missing current value'); // default hero headline
    assert.ok(s.includes('media: preset=ph-dish'), 'missing image slot'); // restaurant hero photo preset
  });

  console.log('defensive model-output parsing');

  await test('parses plain JSON, code-fenced JSON, and prose-wrapped JSON', () => {
    const want = { ops: [{ op: 'setTheme', value: 'mono' }], reply: 'ok' };
    const plain = parseModelPatch(JSON.stringify(want));
    const fenced = parseModelPatch('```json\n' + JSON.stringify(want) + '\n```');
    const prose = parseModelPatch('Sure, here is the patch:\n' + JSON.stringify(want) + '\nHope that helps!');
    [plain, fenced, prose].forEach((p) => {
      assert.deepEqual(p!.ops, want.ops);
      assert.equal(p!.reply, 'ok');
    });
  });

  await test('parse tolerates missing/garbled output (ops defaults to [], non-JSON -> null)', () => {
    assert.deepEqual(parseModelPatch('{"reply":"no ops here"}'), { ops: [], reply: 'no ops here' });
    assert.equal(parseModelPatch('I cannot help with that.'), null);
    assert.equal(parseModelPatch(''), null);
  });

  await test('parse recovers the real object when the model appends a second brace blob (no greedy over-capture)', () => {
    const want = { ops: [{ op: 'setTheme', value: 'teal' }], reply: 'ok' };
    const noisy = JSON.stringify(want) + '\n\nNote: {not: valid json}';
    const p = parseModelPatch(noisy);
    assert.deepEqual(p!.ops, want.ops);
    assert.equal(p!.reply, 'ok');
  });

  console.log('untrusted model output -> applyOps boundary (the security property)');

  await test('a well-formed model patch is applied', () => {
    const out = JSON.stringify({
      ops: [
        { op: 'setText', sectionId: 'hero', slotId: 'headline', value: 'Buongiorno' },
        { op: 'setTheme', value: 'mono' },
        { op: 'toggleSection', sectionId: 'features', enabled: false },
      ],
      reply: 'Updated the hero, theme, and hid the features.',
    });
    const patch = parseModelPatch(out)!;
    const r = applyOps(base(), patch.ops as unknown as EditOp[]);
    assert.equal(r.applied.length, 3);
    assert.equal(r.skipped.length, 0);
    assert.equal(r.next.theme, 'mono');
    assert.equal(r.next.sections.find((s) => s.id === 'hero')!.text.headline, 'Buongiorno');
    assert.equal(r.next.sections.find((s) => s.id === 'features')!.enabled, false);
  });

  await test('a sloppy/malicious model patch cannot corrupt the spec — bad ops skipped, good ones applied', () => {
    const out =
      'Here you go:\n```json\n' +
      JSON.stringify({
        ops: [
          { op: 'setText', sectionId: 'hero', slotId: 'headline', value: 'OK' }, // valid
          { op: 'setText', sectionId: 'ghost', slotId: 'headline', value: 'x' }, // bad section
          { op: 'setTheme', value: 'rainbow' }, // bad enum
          { op: 'deleteEverything' }, // unknown op (malformed)
          { op: 'setText', sectionId: 'hero', slotId: 'headline', value: '<script>alert(1)</script>' }, // valid TEXT (stored as a string, rendered as text)
          { op: 'setTagline', value: 'word '.repeat(60).trim() }, // over maxLen -> CLAMPED, not skipped
        ],
        reply: 'done',
      }) +
      '\n```';
    const patch = parseModelPatch(out)!;
    const before = base();
    const r = applyOps(before, patch.ops as unknown as EditOp[]);
    assert.equal(r.skipped.length, 3); // ghost, rainbow, deleteEverything (bad ids/enums still rejected)
    assert.equal(r.applied.length, 3); // two hero headline sets + the clamped tagline
    assert.ok(r.next.meta.tagline.length <= 120, 'over-length tagline is clamped, not dropped');
    // headline ends as the literal string (NOT executed markup — it's plain spec text)
    assert.equal(r.next.sections.find((s) => s.id === 'hero')!.text.headline, '<script>alert(1)</script>');
    // structural identity untouched + input not mutated
    assert.equal(r.next.templateId, before.templateId);
    assert.equal(r.next.v, before.v);
    assert.deepStrictEqual(before, base());
  });

  console.log('endpoint handler (validation / guard / fallback — no network)');

  async function call(payload: unknown, headers: Record<string, string> = {}) {
    const req = new Request('https://site.test/api/edit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof payload === 'string' ? payload : JSON.stringify(payload),
    });
    const res = await POST({ request: req } as any);
    return { status: res.status, body: (await res.json()) as any };
  }

  await test('no key -> graceful fallback (spec echoed unchanged, source=fallback, never throws)', async () => {
    const spec = base();
    const { status, body } = await call({ message: 'make it mono', spec });
    assert.equal(status, 200);
    assert.equal(body.source, 'fallback');
    assert.deepEqual(body.applied, []);
    assert.deepEqual(body.skipped, []);
    assert.equal(body.spec.templateId, 'restaurant');
    // exact echo of the sanitized spec (JSON-normalized: the Response drops undefined-valued optional keys)
    assert.deepStrictEqual(body.spec, JSON.parse(JSON.stringify(validateSpec(spec))));
  });

  await test('rejects invalid body / missing message / invalid spec', async () => {
    assert.equal((await call('not json at all')).status, 400);
    assert.equal((await call({ spec: base() })).status, 400); // no message
    assert.equal((await call({ message: 'hi', spec: { templateId: 'does-not-exist' } })).status, 400);
  });

  await test('cross-origin request is blocked (403)', async () => {
    const { status } = await call(
      { message: 'hi', spec: base() },
      { origin: 'https://evil.example', 'x-forwarded-host': 'site.test' },
    );
    assert.equal(status, 403);
  });

  await test('GET is 405', async () => {
    const res = await GET({} as any);
    assert.equal(res.status, 405);
  });

  console.log('AI branch (NVIDIA call mocked — exercises the real fetch path)');

  // Stub a key so the endpoint takes the AI path, and mock global fetch so no
  // network call happens. Restore both after each test.
  const realFetch = globalThis.fetch;
  async function withMock(
    fetchImpl: (url: any, init: any) => Promise<any> | any,
    fn: () => Promise<void>,
  ) {
    process.env.NVIDIA_API_KEY = 'test-key-not-real';
    (globalThis as any).fetch = async (url: any, init: any) => fetchImpl(url, init);
    try {
      await fn();
    } finally {
      (globalThis as any).fetch = realFetch;
      delete process.env.NVIDIA_API_KEY;
    }
  }
  // Shape a minimal NVIDIA chat-completions Response.
  const ok = (content: string) => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => '',
  });

  await test('AI success: valid patch is applied, source=ai, ops land', async () => {
    await withMock(
      () => ok(JSON.stringify({ ops: [{ op: 'setTheme', value: 'mono' }, { op: 'setText', sectionId: 'hero', slotId: 'headline', value: 'Ciao' }], reply: 'Updated.' })),
      async () => {
        const { status, body } = await call({ message: 'make it mono and greet in italian', spec: base() });
        assert.equal(status, 200);
        assert.equal(body.source, 'ai');
        assert.equal(body.reply, 'Updated.');
        assert.equal(body.applied.length, 2);
        assert.equal(body.skipped.length, 0);
        assert.equal(body.spec.theme, 'mono');
        assert.equal(body.spec.sections.find((s: any) => s.id === 'hero').text.headline, 'Ciao');
      },
    );
  });

  await test('AI success with junk ops: bad ones skipped, good ones applied, never throws', async () => {
    await withMock(
      () => ok(JSON.stringify({ ops: [{ op: 'setTheme', value: 'rainbow' }, { op: 'setTagline', value: 'Fresh & local' }], reply: 'ok' })),
      async () => {
        const { status, body } = await call({ message: 'x', spec: base() });
        assert.equal(status, 200);
        assert.equal(body.source, 'ai');
        assert.equal(body.applied.length, 1); // tagline applied
        assert.equal(body.skipped.length, 1); // rainbow theme skipped
        assert.equal(body.spec.meta.tagline, 'Fresh & local');
      },
    );
  });

  await test('AI returns empty reply -> defaults to "Done."', async () => {
    await withMock(
      () => ok(JSON.stringify({ ops: [{ op: 'setTheme', value: 'dark' }], reply: '' })),
      async () => {
        const { body } = await call({ message: 'dark mode', spec: base() });
        assert.equal(body.source, 'ai');
        assert.equal(body.reply, 'Done.');
      },
    );
  });

  await test('endpoint forwards sanitized history to the model (drops bad entries)', async () => {
    let sentMessages: any[] = [];
    await withMock(
      (_url, init) => { sentMessages = JSON.parse(init.body).messages; return ok(JSON.stringify({ ops: [], reply: 'ok' })); },
      async () => {
        await call({
          message: 'all of them',
          spec: base(),
          history: [
            { role: 'user', content: 'make it mafia style' },
            { role: 'assistant', content: 'Which sections?' },
            { role: 'bogus', content: 'drop me' }, // bad role -> dropped
            { role: 'user', content: 123 }, // non-string -> dropped
          ],
        });
      },
    );
    assert.deepEqual(sentMessages.map((m) => m.role), ['system', 'user', 'assistant', 'user']);
    assert.ok(sentMessages[3].content.includes('USER REQUEST: all of them'));
  });

  await test('endpoint forwards the site language so the model writes in it', async () => {
    let sent: any[] = [];
    await withMock(
      (_url: any, init: any) => { sent = JSON.parse(init.body).messages; return ok(JSON.stringify({ ops: [], reply: 'ok' })); },
      async () => { await call({ message: 'make it shorter', spec: base(), lang: 'ro' }); },
    );
    assert.ok(sent.some((m) => typeof m.content === 'string' && m.content.includes('Romanian')), 'site language not conveyed to the model');
  });

  await test('NVIDIA non-200 -> graceful fallback, spec unchanged', async () => {
    await withMock(
      () => ({ ok: false, status: 502, text: async () => 'upstream error', json: async () => ({}) }),
      async () => {
        const { status, body } = await call({ message: 'make it mono', spec: base() });
        assert.equal(status, 200);
        assert.equal(body.source, 'fallback');
        assert.deepEqual(body.applied, []);
        assert.equal(body.spec.theme, base().theme); // untouched
      },
    );
  });

  await test('fast model 5xx -> escalates to the smart model and recovers', async () => {
    let calls = 0;
    await withMock(
      () => {
        calls++;
        return calls === 1
          ? { ok: false, status: 503, text: async () => 'overloaded', json: async () => ({}) } // fast fails
          : ok(JSON.stringify({ ops: [{ op: 'setTheme', value: 'mono' }], reply: 'ok' })); // smart recovers
      },
      async () => {
        const { body } = await call({ message: 'make it mono', spec: base() });
        assert.equal(body.source, 'ai'); // smart model recovered
        assert.equal(body.spec.theme, 'mono');
      },
    );
    assert.equal(calls, 2); // 1 fast (fail) + 1 smart (ok)
  });

  await test('all attempts fail (fast + both smart) -> graceful fallback', async () => {
    let calls = 0;
    await withMock(
      () => { calls++; return { ok: false, status: 500, text: async () => 'err', json: async () => ({}) }; },
      async () => {
        const { body } = await call({ message: 'x', spec: base() });
        assert.equal(body.source, 'fallback');
        assert.equal(body.reason, 'upstream');
      },
    );
    assert.equal(calls, 3); // 1 fast + 2 smart attempts, then gives up
  });

  await test('escalates to the smart model only when the fast one emits all-invalid ops', async () => {
    let fastCalls = 0, smartCalls = 0;
    await withMock(
      (_url: any, init: any) => {
        const model = JSON.parse(init.body).model as string;
        if (model.includes('70b')) { smartCalls++; return ok(JSON.stringify({ ops: [{ op: 'setTheme', value: 'mono' }], reply: 'fixed' })); }
        fastCalls++; return ok(JSON.stringify({ ops: [{ op: 'setTheme', value: 'rainbow' }], reply: 'done' })); // invalid -> skipped
      },
      async () => {
        const { body } = await call({ message: 'x', spec: base() });
        assert.equal(body.source, 'ai');
        assert.equal(body.spec.theme, 'mono'); // the smart model's valid op landed
        assert.ok(body.applied.length >= 1);
      },
    );
    assert.ok(fastCalls >= 1 && smartCalls === 1);
  });

  await test('does NOT escalate when the fast model succeeds (no smart call)', async () => {
    let smartCalls = 0;
    await withMock(
      (_url: any, init: any) => {
        if ((JSON.parse(init.body).model as string).includes('70b')) smartCalls++;
        return ok(JSON.stringify({ ops: [{ op: 'setTheme', value: 'mono' }], reply: 'ok' }));
      },
      async () => {
        const { body } = await call({ message: 'x', spec: base() });
        assert.equal(body.spec.theme, 'mono');
      },
    );
    assert.equal(smartCalls, 0); // fast succeeded -> stayed fast
  });

  console.log('every Assistant suggestion chip applies through the REAL endpoint + applyOps');

  const suggestions: { name: string; ops: any[]; check: (s: any) => boolean }[] = [
    { name: 'Make it dark', ops: [{ op: 'setTheme', value: 'dark' }], check: (s) => s.theme === 'dark' },
    { name: 'Warmer colors', ops: [{ op: 'setTheme', value: 'rose' }], check: (s) => s.theme === 'rose' }, // restaurant default is already 'warm', so a real warm change = rose
    { name: 'Use a modern font', ops: [{ op: 'setFont', value: 'modern' }], check: (s) => s.font === 'modern' },
    { name: 'Add gentle animations', ops: [{ op: 'setAnimation', value: 'fade' }], check: (s) => s.animation === 'fade' },
    { name: 'Punchier headline', ops: [{ op: 'setText', sectionId: 'hero', slotId: 'headline', value: 'Bold new taste' }], check: (s) => s.sections.find((x: any) => x.id === 'hero').text.headline === 'Bold new taste' },
    { name: 'Shorten the intro', ops: [{ op: 'setText', sectionId: 'hero', slotId: 'subhead', value: 'Fresh. Daily.' }], check: (s) => s.sections.find((x: any) => x.id === 'hero').text.subhead === 'Fresh. Daily.' },
    { name: 'Hide the gallery', ops: [{ op: 'toggleSection', sectionId: 'gallery', enabled: false }], check: (s) => s.sections.find((x: any) => x.id === 'gallery').enabled === false },
  ];
  for (const c of suggestions) {
    await test(`suggestion "${c.name}" applies + changes the spec`, async () => {
      await withMock(() => ok(JSON.stringify({ ops: c.ops, reply: 'done' })), async () => {
        const { body } = await call({ message: c.name, spec: base() });
        assert.equal(body.source, 'ai');
        assert.ok(body.applied.length >= 1, 'nothing applied');
        assert.equal(body.skipped.length, 0);
        assert.ok(c.check(body.spec), 'spec not changed as expected');
      });
    });
  }

  await test('suggestion "Friendlier tone" (broad, over-length rewrite) clamps + applies every slot', async () => {
    const long = 'A really warm and friendly welcome to every single guest who walks through our cosy little door each and every single day of the week here'; // ~140+
    const ops = [
      { op: 'setText', sectionId: 'hero', slotId: 'headline', value: 'Come on in, friends — always welcome at our place' },
      { op: 'setText', sectionId: 'hero', slotId: 'subhead', value: long },
      { op: 'setText', sectionId: 'features', slotId: 'item1.body', value: long }, // > 140 -> clamp, NOT skip
      { op: 'setText', sectionId: 'about', slotId: 'body', value: long },
    ];
    await withMock(() => ok(JSON.stringify({ ops, reply: 'Made it friendlier.' })), async () => {
      const { body } = await call({ message: 'Friendlier tone', spec: base() });
      assert.equal(body.source, 'ai');
      assert.equal(body.applied.length, 4, 'all 4 slots should apply (clamped), none skipped');
      assert.equal(body.skipped.length, 0);
      const feat = body.spec.sections.find((x: any) => x.id === 'features');
      assert.ok(feat.text['item1.body'].length <= 140, 'over-length body clamped to slot max');
      assert.ok(feat.text['item1.body'].length > 0);
    });
  });

  await test('fetch throws / aborts -> graceful fallback (never crashes the request)', async () => {
    await withMock(
      () => { throw new Error('aborted'); },
      async () => {
        const { status, body } = await call({ message: 'make it mono', spec: base() });
        assert.equal(status, 200);
        assert.equal(body.source, 'fallback');
        assert.equal(body.spec.theme, base().theme);
      },
    );
  });

  await test('unparseable model output -> graceful fallback', async () => {
    await withMock(
      () => ok('I am terribly sorry but I cannot do that, no JSON here.'),
      async () => {
        const { status, body } = await call({ message: 'do something weird', spec: base() });
        assert.equal(status, 200);
        assert.equal(body.source, 'fallback');
        assert.deepEqual(body.applied, []);
      },
    );
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

run();
