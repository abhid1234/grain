import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { session, ev, eventsOf, isSession } from '../src/core/model.js';
import { classify, canonical, extractCommands } from '../src/core/signals/commands.js';
import { distill } from '../src/core/distill.js';
import { renderBrief } from '../src/core/render/brief.js';
import { loadTranscript } from '../src/adapters/claudecode.js';
import { redact, hasSecret } from '../src/core/redact.js';
import { classifyCorrection, preferenceKey, extractCorrections, isNoise } from '../src/core/signals/corrections.js';
import { classifyUndo, pathsIn, extractReverts } from '../src/core/signals/reverts.js';
import { observe, extractConventions } from '../src/core/signals/conventions.js';
import { renderAgents } from '../src/core/render/agents.js';
import { lineDiff, summarizeDiff, renderDiff } from '../src/core/diff.js';

const here = dirname(fileURLToPath(import.meta.url));

// A hand-built session used across the pure-core tests.
const s = session('t1', '/repo', [
  ev.prompt('do the thing'),
  ev.tool('Bash', { command: 'node --test' }),
  ev.tool('Bash', { command: 'npm test' }),
  ev.tool('Bash', { command: 'git commit -m x' }),
  ev.tool('Write', { file_path: 'a.js', content: '...' }),
  ev.tool('Bash', { command: 'eslint .' }),
  ev.result(true, 'ok'),
]);

test('model', (t) => Promise.all([
  t.test('isSession', () => assert.equal(isSession(s), true)),
  t.test('eventsOf by kind', () => assert.equal(eventsOf(s, 'tool').length, 5)),
  t.test('eventsOf by tool', () => assert.equal(eventsOf(s, 'tool', 'Bash').length, 4)),
  t.test('prompt ctor', () => assert.deepEqual(ev.prompt('hi'), { kind: 'prompt', text: 'hi' })),
]));

test('classify', (t) => {
  const cases = [
    { input: 'node --test', want: 'test' },
    { input: 'npm test', want: 'test' },
    { input: 'git commit -m x', want: 'vcs' },
    { input: 'npm run build', want: 'build' },
    { input: 'npm install', want: 'deps' },
    { input: 'eslint .', want: 'lint' },
    { input: 'node examples/x.mjs', want: 'run' },
    { input: 'ls -la', want: 'other' },
  ];
  return Promise.all(cases.map((c) =>
    t.test(c.input, () => assert.equal(classify(c.input), c.want))));
});

test('canonical', (t) => Promise.all([
  t.test('two tokens', () => assert.equal(canonical('git commit -m "x"'), 'git commit')),
  t.test('stops at &&', () => assert.equal(canonical('git add -A && git commit'), 'git add')),
  t.test('single token', () => assert.equal(canonical('ls'), 'ls')),
]));

test('extractCommands', (t) => Promise.all([
  t.test('only Bash tools', () => assert.equal(extractCommands(s).length, 4)),
  t.test('classifies', () =>
    assert.deepEqual(extractCommands(s).map((c) => c.category), ['test', 'test', 'vcs', 'lint'])),
]));

test('distill', (t) => {
  const ctx = distill([s, s]); // two identical sessions -> doubled counts
  return Promise.all([
    t.test('counts commands', () => assert.equal(ctx.commandCount, 8)),
    t.test('session count', () => assert.equal(ctx.sessionCount, 2)),
    t.test('test category freq-sorted', () =>
      assert.deepEqual(ctx.commands.test, [{ cmd: 'node --test', n: 2 }, { cmd: 'npm test', n: 2 }])),
    t.test('vcs present', () => assert.deepEqual(ctx.commands.vcs, [{ cmd: 'git commit', n: 2 }])),
  ]);
});

test('renderBrief', (t) => {
  const out = renderBrief(distill([s]));
  return Promise.all([
    t.test('has header', () => assert.match(out, /Repo brief — distilled by Grain/)),
    t.test('mentions test section', () => assert.match(out, /How this repo is tested/)),
    t.test('shows a command', () => assert.match(out, /`node --test`/)),
  ]);
});

test('redact', (t) => {
  const cases = [
    { name: 'vercel token', in: 'export VERCEL_TOKEN="vcp_FAKEfakeFAKEfakeFAKEfake0000"', match: /<redacted:secret>/, gone: /vcp_FAKE/ },
    { name: 'anthropic key', in: 'ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwxyz012345', match: /<redacted:secret>/, gone: /sk-ant-api03-abc/ },
    { name: 'bare github token', in: 'token ghp_abcdefghijklmnopqrstuvwxyz0123456789', match: /<redacted:github-token>/, gone: /ghp_abcdef/ },
    { name: 'email', in: 'contact me at das.abhijit34@gmail.com please', match: /<redacted:email>/, gone: /gmail\.com/ },
    { name: 'leaves normal text', in: 'node --test && git commit', match: /node --test && git commit/, gone: /<redacted/ },
  ];
  return Promise.all(cases.map((c) => t.test(c.name, () => {
    const out = redact(c.in);
    assert.match(out, c.match);
    assert.doesNotMatch(out, c.gone);
  })));
});

test('hasSecret', (t) => Promise.all([
  t.test('detects', () => assert.equal(hasSecret('key=ghp_abcdefghijklmnopqrstuvwxyz0123456789'), true)),
  t.test('clean', () => assert.equal(hasSecret('just a normal command'), false)),
]));

test('commands: meaningful segment beats cd/export prefix', (t) => Promise.all([
  t.test('skips cd', () => assert.equal(canonical('cd ~/repo && node --test'), 'node --test')),
  t.test('skips export secret', () => assert.equal(canonical('export TOKEN="vcp_aaaaaaaaaaaaaaaaaaaaaaaa" && vercel deploy'), 'vercel deploy')),
  t.test('classifies through cd', () => assert.equal(classify('cd ~/repo && npm test'), 'test')),
]));

test('classifyCorrection', (t) => {
  const cases = [
    { input: 'no, revert that change', want: 'revert' },
    { input: "don't use a class here", want: 'negation' },
    { input: 'actually, make it return a Result', want: 'redirect' },
    { input: 'No. Try the other approach.', want: 'no-lead' },
    { input: 'looks great, ship it', want: null },
    { input: 'add another test please', want: null },
  ];
  return Promise.all(cases.map((c) =>
    t.test(c.input, () => assert.equal(classifyCorrection(c.input), c.want))));
});

test('preferenceKey', (t) => Promise.all([
  t.test('normalizes + trims to 6 words', () =>
    assert.equal(preferenceKey("Don't use floats — use integer cents instead!"), 'dont use floats use integer cents')),
  t.test('collapses whitespace/case', () =>
    assert.equal(preferenceKey('REVERT   That'), 'revert that')),
]));

test('isNoise (harness/system text is not a correction)', (t) => Promise.all([
  t.test('long block', () => assert.equal(isNoise('no '.repeat(120)), true)),
  t.test('local-command caveat', () => assert.equal(isNoise('<local-command-caveat> do not respond'), true)),
  t.test('build tick', () => assert.equal(isNoise('GRAIN BUILD TICK — do not ask questions'), true)),
  t.test('real short correction is fine', () => assert.equal(isNoise("no, don't use floats"), false)),
]));

test('extractCorrections filters noise', (t) => {
  const sess = session('n1', '/r', [
    ev.tool('Bash', { command: 'ls' }),
    ev.prompt('<local-command-caveat> do not respond to these messages'),
    ev.prompt("no, don't use floats"),
  ]);
  return t.test('only the human correction survives', () =>
    assert.deepEqual(extractCorrections(sess).map((c) => c.kind), ['negation']));
});

test('extractCorrections', (t) => {
  // prompt, agent acts, then corrections follow; a leading ask is not a correction.
  const sess = session('c1', '/repo', [
    ev.prompt("don't do this yet"),          // ignored: no prior agent action
    ev.tool('Write', { file_path: 'a.js' }),
    ev.prompt('no, use integer cents'),
    ev.say('okay'),
    ev.tool('Edit', { file_path: 'a.js' }),
    ev.prompt('actually, return a Result instead of throwing'),
    ev.prompt('great, thanks'),               // not a correction
    ev.prompt('revert that last change'),
  ]);
  const got = extractCorrections(sess);
  return Promise.all([
    t.test('ignores the opening ask', () => assert.equal(got.length, 3)),
    t.test('kinds detected', () =>
      assert.deepEqual(got.map((c) => c.kind), ['no-lead', 'redirect', 'revert'])),
    t.test('redacts', () => {
      const s2 = session('c2', '/r', [
        ev.tool('Bash', { command: 'ls' }),
        ev.prompt("don't hardcode ghp_abcdefghijklmnopqrstuvwxyz0123456789 in there"),
      ]);
      assert.doesNotMatch(extractCorrections(s2)[0].text, /ghp_abcdef/);
    }),
  ]);
});

test('distill: corrections', (t) => {
  const sess = session('d1', '/repo', [
    ev.tool('Write', { file_path: 'a.js' }),
    ev.prompt('no, use integer cents'),
    ev.tool('Edit', { file_path: 'a.js' }),
    ev.prompt('no, use integer cents'),        // recurring -> candidate preference
    ev.tool('Edit', { file_path: 'a.js' }),
    ev.prompt('revert that'),
  ]);
  const ctx = distill([sess]);
  return Promise.all([
    t.test('counts', () => assert.equal(ctx.corrections.count, 3)),
    t.test('byKind', () => assert.deepEqual(ctx.corrections.byKind, { 'no-lead': 2, revert: 1 })),
    t.test('recurring surfaced', () => {
      assert.equal(ctx.corrections.recurring.length, 1);
      assert.equal(ctx.corrections.recurring[0].n, 2);
    }),
    t.test('render shows the section', () =>
      assert.match(renderBrief(ctx), /What reviewers kept correcting/)),
  ]);
});

test('classifyUndo', (t) => {
  const cases = [
    { input: 'git reset --hard', want: 'bulk-reset' },
    { input: 'git checkout .', want: 'bulk-reset' },
    { input: 'git stash', want: 'bulk-reset' },
    { input: 'git revert abc1234', want: 'git-revert' },
    { input: 'git restore src/x.js', want: 'git-restore' },
    { input: 'git checkout -- src/x.js', want: 'git-checkout' },
    { input: 'rm -f scratch.js', want: 'removed' },
    { input: 'git stash list', want: null },
    { input: 'npm test', want: null },
  ];
  return Promise.all(cases.map((c) =>
    t.test(c.input, () => assert.equal(classifyUndo(c.input), c.want))));
});

test('pathsIn', (t) => Promise.all([
  t.test('checkout path', () => assert.deepEqual(pathsIn('git checkout -- src/a.js'), ['src/a.js'])),
  t.test('multiple rm paths', () => assert.deepEqual(pathsIn('rm -f a.js b.js'), ['a.js', 'b.js'])),
  t.test('ignores refs and flags', () => assert.deepEqual(pathsIn('git checkout HEAD --force'), [])),
]));

test('extractReverts', (t) => {
  const sess = session('r1', '/repo', [
    ev.tool('Write', { file_path: 'src/a.js' }),
    ev.tool('Edit', { file_path: 'src/b.js' }),
    ev.tool('Bash', { command: 'git checkout -- src/a.js' }),   // a.js restored -> dead end
    ev.tool('Write', { file_path: 'src/c.js' }),
    ev.tool('Bash', { command: 'rm src/c.js' }),                // c.js removed -> dead end
    ev.tool('Bash', { command: 'git commit -m wip' }),          // clears pending
    ev.tool('Write', { file_path: 'src/e.js' }),
    ev.tool('Bash', { command: 'git reset --hard' }),           // bulk: e.js abandoned
  ]);
  const got = extractReverts(sess);
  return Promise.all([
    t.test('finds three dead ends', () => assert.equal(got.length, 3)),
    t.test('reasons in order', () =>
      assert.deepEqual(got.map((r) => r.reason), ['git-checkout', 'removed', 'bulk-reset'])),
    t.test('files in order', () =>
      assert.deepEqual(got.map((r) => r.file), ['src/a.js', 'src/c.js', 'src/e.js'])),
    t.test('rm of a non-session file is ignored', () => {
      const s2 = session('r2', '/r', [ev.tool('Bash', { command: 'rm /tmp/unrelated.log' })]);
      assert.equal(extractReverts(s2).length, 0);
    }),
  ]);
});

test('distill: reverts', (t) => {
  const sess = session('dr', '/repo', [
    ev.tool('Write', { file_path: 'a.js' }),
    ev.tool('Bash', { command: 'git checkout -- a.js' }),
    ev.tool('Write', { file_path: 'a.js' }),
    ev.tool('Bash', { command: 'git checkout -- a.js' }),
  ]);
  const ctx = distill([sess]);
  return Promise.all([
    t.test('counts', () => assert.equal(ctx.reverts.count, 2)),
    t.test('byReason', () => assert.deepEqual(ctx.reverts.byReason, { 'git-checkout': 2 })),
    t.test('top file', () => assert.deepEqual(ctx.reverts.files[0], { file: 'a.js', n: 2 })),
    t.test('render shows dead-ends section', () =>
      assert.match(renderBrief(ctx), /Paths tried and abandoned/)),
  ]);
});

const ESM_TEST_CODE = [
  "import test from 'node:test';",
  "import assert from 'node:assert/strict';",
  "import { ok, err } from '../src/result.js';",
  '',
  'export function thing(x) {',
  '  const cases = [{ in: 1, want: 2 }];',
  "  if (!x) return err('bad-input');",
  '  return ok(x);',
  '}',
].join('\n');

test('observe conventions', (t) => {
  const obs = observe(ESM_TEST_CODE);
  const has = (dim, val) => obs.some((o) => o.dimension === dim && o.value === val);
  return Promise.all([
    t.test('esm module', () => assert.equal(has('module', 'esm'), true)),
    t.test('node:test runner', () => assert.equal(has('test-runner', 'node:test'), true)),
    t.test('node:assert', () => assert.equal(has('assert', 'node:assert'), true)),
    t.test('table-driven', () => assert.equal(has('test-style', 'table-driven'), true)),
    t.test('result-return errors', () => assert.equal(has('errors', 'result-return'), true)),
    t.test('single quotes', () => assert.equal(has('quotes', 'single'), true)),
    t.test('2-space indent', () => assert.equal(has('indent', '2-space'), true)),
    t.test('deduped per content', () =>
      assert.equal(obs.filter((o) => o.dimension === 'module').length, 1)),
  ]);
});

test('observe: cjs + throw + double quotes', (t) => {
  const code = 'const x = require("fs");\nfunction f() {\n    throw new Error("nope");\n}';
  const obs = observe(code);
  const has = (dim, val) => obs.some((o) => o.dimension === dim && o.value === val);
  return Promise.all([
    t.test('cjs', () => assert.equal(has('module', 'cjs'), true)),
    t.test('throw', () => assert.equal(has('errors', 'throw'), true)),
    t.test('double quotes', () => assert.equal(has('quotes', 'double'), true)),
    t.test('4-space indent', () => assert.equal(has('indent', '4-space'), true)),
  ]);
});

test('observe redacts examples', () => {
  const code = "import x from 'node:test'; // key=ghp_abcdefghijklmnopqrstuvwxyz0123456789";
  for (const o of observe(code)) if (o.example) assert.doesNotMatch(o.example, /ghp_abcdef/);
});

test('distill: conventions', (t) => {
  const sess = session('cv', '/repo', [
    ev.tool('Write', { file_path: 'a.js', content: ESM_TEST_CODE }),
    ev.tool('Write', { file_path: 'b.js', content: ESM_TEST_CODE }),
    ev.tool('Write', { file_path: 'c.js', content: 'const y = require("x");' }),
  ]);
  const ctx = distill([sess]);
  return Promise.all([
    t.test('module dominant is esm', () => assert.equal(ctx.conventions.module.dominant.value, 'esm')),
    t.test('esm counted twice', () => assert.equal(ctx.conventions.module.dominant.n, 2)),
    t.test('errors dominant is result-return', () =>
      assert.equal(ctx.conventions.errors.dominant.value, 'result-return')),
    t.test('render shows conventions section', () =>
      assert.match(renderBrief(ctx), /House conventions/)),
  ]);
});

test('renderAgents proposal', (t) => {
  // Build a rich context: a test command, esm/result conventions, a recurring
  // correction, and an abandoned file.
  const code = [
    "import test from 'node:test';",
    "import { err, ok } from '../src/result.js';",
    'export function f(x) {',
    '  const cases = [];',
    "  if (!x) return err('bad');",
    '  return ok(x);',
    '}',
  ].join('\n');
  const sess = session('a1', '/repo', [
    ev.tool('Write', { file_path: 'src/f.js', content: code }),
    ev.tool('Bash', { command: 'node --test' }),
    ev.prompt('no, return a Result not a throw'),
    ev.tool('Edit', { file_path: 'src/f.js', new_string: code }),
    ev.prompt('no, return a Result not a throw'),   // recurring
    ev.tool('Write', { file_path: 'src/scratch.js', content: code }),
    ev.tool('Bash', { command: 'git checkout -- src/scratch.js' }),
    ev.tool('Bash', { command: 'git checkout -- src/scratch.js' }),
  ]);
  const md = renderAgents(distill([sess]));
  return Promise.all([
    t.test('has proposed header', () => assert.match(md, /AGENTS\.md — proposed by Grain/)),
    t.test('proposes the test command', () => assert.match(md, /\*\*Test:\*\* `node --test`/)),
    t.test('esm rule', () => assert.match(md, /Use ESM/)),
    t.test('node:test rule', () => assert.match(md, /node:test/)),
    t.test('table-driven rule', () => assert.match(md, /table-driven/)),
    t.test('result rule', () => assert.match(md, /Return a `Result`/)),
    t.test('preference surfaced', () => assert.match(md, /return a Result not a throw/)),
    t.test('anti-pattern surfaced', () => assert.match(md, /scratch\.js` was reverted/)),
  ]);
});

test('lineDiff', (t) => Promise.all([
  t.test('added line', () => {
    const d = lineDiff('a\nb', 'a\nb\nc');
    assert.deepEqual(d[d.length - 1], { type: 'added', line: 'c' });
  }),
  t.test('removed line', () => {
    const d = lineDiff('a\nb\nc', 'a\nc');
    assert.equal(d.some((x) => x.type === 'removed' && x.line === 'b'), true);
  }),
  t.test('identical is all common', () => {
    const d = lineDiff('x\ny', 'x\ny');
    assert.equal(d.every((x) => x.type === 'common'), true);
  }),
  t.test('summarize counts', () => {
    const s = summarizeDiff(lineDiff('a\nb', 'a\nc\nd'));
    assert.deepEqual(s, { added: 2, removed: 1, common: 1 });
  }),
  t.test('renderDiff marks +/-', () => {
    const out = renderDiff(lineDiff('old', 'new'));
    assert.match(out, /\+ new/);
    assert.match(out, /- old/);
  }),
]));

test('adapter: loadTranscript', (t) => {
  const sess = loadTranscript(join(here, 'fixtures', 'tiny.jsonl'));
  return Promise.all([
    t.test('captures project cwd', () => assert.equal(sess.project, '/repo/demo')),
    t.test('has a prompt', () => assert.equal(eventsOf(sess, 'prompt')[0].text, 'add a feature and test it')),
    t.test('has thinking', () => assert.equal(eventsOf(sess, 'think').length, 1)),
    t.test('parses bash tools', () => assert.equal(eventsOf(sess, 'tool', 'Bash').length, 4)),
    t.test('parses a result', () => assert.equal(eventsOf(sess, 'result')[0].ok, true)),
    t.test('end-to-end distill', () => {
      const ctx = distill([sess]);
      assert.equal(ctx.commands.test.length >= 1, true);
      assert.equal(ctx.commands.vcs.length >= 1, true);
    }),
  ]);
});
