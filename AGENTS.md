# AGENTS.md — house rules for `grain`

Grain is a tool about project-specific context, so it holds itself to the same
standard it preaches. These are the invariants.

## 1. Pure core, impure edges.

Everything under `src/core/` is pure: `(data) -> data`, no `node:` imports, no I/O,
no clock, no randomness. All filesystem / process / network access lives in
`src/adapters/` and `src/cli/`. This is what lets the whole distillation engine be
tested offline against plain-object fixtures.

## 2. Nothing leaves the core unredacted.

Session transcripts can be more sensitive than the code they produced. Every
string that could reach output passes through `src/core/redact.js` first. A new
signal or renderer that emits transcript-derived text MUST redact it. There is a
test that asserts known secret shapes never survive.

## 3. Deterministic. Same sessions in, same context out.

No `Date.now()` / `Math.random()` in the core. Frequencies are sorted with a
stable tie-break (count desc, then lexical). The optional LLM layer may only
*phrase* what the deterministic pass already found — it never invents a rule.

## 4. Signals are small, pure, and independent.

Each file in `src/core/signals/` extracts one kind of evidence from a `Session`
and returns plain data. Signals don't know about each other or about rendering.
`distill.js` is the only place that combines them.

## 5. Tests are table-driven, `node:test`, zero dependencies.

Same shape as the rest of the house: a `cases` array, one assertion loop, run with
`node --test`. Fixtures are small, hand-trimmed, and redacted.

## 6. The session model is the contract.

All sources normalize to `src/core/model.js` (`Session` = ordered `Event[]`).
Adapters translate; signals consume the normalized shape. Add a source by writing
an adapter, never by teaching a signal a new raw format.
