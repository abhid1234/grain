# grain 🌾

**Turn your agents' sessions into your repo's house rules.**

An AI coding agent is only as good as the project-specific context it's given.
`AGENTS.md` and skills carry that context — but writing them is guesswork, and you
do it *before* you've watched an agent actually work in the repo.

Grain flips that around. It reads your **captured agent-coding sessions** and
distills the context the sessions already prove: how the repo is really tested and
built, the conventions your reviews kept enforcing, and — crucially — the **dead
ends you kept reverting**. Then it writes that back as a brief you can drop into
`AGENTS.md`.

> The final diff shows *what* shipped. The session shows *how* you got there —
> the corrections, the false starts, the commands that actually work. That "how"
> is the most useful training signal in the building, and it's normally thrown
> away the moment the PR merges.

## Why this needs [Entire](https://entire.io)

Grain is only possible because something keeps the **whole session** linked to the
commit — not just the final pull request. [Entire](https://entire.io) is that
layer: it captures each agent session and ties it to the code it produced. Grain
is the downstream use — it turns that captured history into living, project-specific
context. (Grain also reads raw Claude Code transcripts directly, so you can try it
today.)

## Try it

```bash
# Distill a brief from a repo's captured sessions
npx grain scan ~/.claude/projects/<your-encoded-repo-path>/
```

Example output (real, from this machine — secrets auto-redacted):

```
# Repo brief — distilled by Grain

## How this repo is tested
- `node --test`  ·  64×
- `npm test`  ·  22×
...
```

## Safety first

Transcripts can hold live secrets and PII. **Nothing leaves Grain's core without
passing through redaction** (`src/core/redact.js`) — API keys, tokens, JWTs, and
emails are scrubbed to labelled placeholders before anything is rendered. There's
a test asserting known secret shapes never survive. This is the same concern that
makes session-log tooling an *enterprise* question, taken seriously from line one.

## How it works

```
sources → normalize → signals → distill → render
 (Entire / Claude Code)  Session   (pure)   RepoContext   AGENTS.md + brief
```

- **Adapters** (`src/adapters/`) load a source into a normalized `Session`.
- **Signals** (`src/core/signals/`) each extract one kind of evidence — commands,
  corrections, reverts, conventions — as plain data.
- **Distill** combines them into a deterministic `RepoContext`.
- **Render** emits a brief (and, soon, a proposed `AGENTS.md` diff).

The core is pure and zero-dependency; see [`AGENTS.md`](AGENTS.md) for the house
rules and [`BUILD_PLAN.md`](BUILD_PLAN.md) for where it's headed.

## Status

Early and building in the open. This is a personal experiment exploring what
becomes possible when agent sessions are first-class, durable artifacts — not an
endorsement of any product. Evaluate any tool against your own security and
compliance needs.

MIT © Abhi Das
