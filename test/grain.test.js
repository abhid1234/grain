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
