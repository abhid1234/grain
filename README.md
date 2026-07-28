# grain 🌾

**Turn your agents' sessions into your repo's house rules.**

Every coding agent is brilliant and completely amnesiac. It writes the code, you
correct it, you steer it away from the three things that don't work in this repo —
then the PR merges and that whole conversation disappears. All that survives is the
diff, and the next session starts from zero.

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
layer: *"fast, distributed, independent Git hosting for agents and humans."*

Two halves matter here:

- **The session layer** — every agent session stored in your repo, a checkpoint for
  every commit, context that's attached rather than archived. That's what makes
  reviewing *intent*, searching sessions, and resuming work across agents possible.
- **The distributed git network** — regional mirrors (US East, EU Central,
  Australia) tuned for agent throughput, where every clone carries its checkpoints
  and session history at shallow-clone speed.

It is **not a GitHub replacement** — you keep your repo where it is and Entire
mirrors it. GitHub is built for a world where humans write the commits; Entire is
built for one where agents write many of them, so the unit of history becomes the
diff *plus the conversation that produced it*.

Grain is the downstream use — it turns that captured history into living,
project-specific context. (Grain also reads raw Claude Code transcripts directly,
so you can try it today.)

## Try it

```bash
grain sources                       # list your Claude Code transcript dirs
grain scan   <dir|--entire .>       # distill a repo brief from session logs
grain agents <dir|--entire .>       # propose an AGENTS.md  (add --llm to rephrase, --against to diff)
grain audit  <dir|--entire .>       # per-file provenance: who/what produced the repo
```

See [`examples/AGENTS.sample.md`](examples/AGENTS.sample.md) for real, unedited
`grain agents` output (secrets and home paths auto-redacted).

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

`v0.2.0`. Four signals (commands, corrections, dead-ends, conventions), three
commands (`scan` / `agents` / `audit`), the Entire adapter with provenance, and an
optional cautious-only LLM layer — ~190 zero-dependency tests. See
[`DEMO.md`](DEMO.md) for real output and [`LAUNCH.md`](LAUNCH.md) for the writeup.

This is a personal experiment exploring what becomes possible when agent sessions
are first-class, durable artifacts — not an endorsement of any product. Evaluate
any session-log tooling against your own security and compliance needs.

### Built in the open

grain was itself built by an AI agent over a sequence of hourly iterations, each
one scoped, tested, and committed — the same kind of session history grain is
designed to read. Fitting, for a tool about learning from how software actually
gets made.

MIT © Abhi Das
