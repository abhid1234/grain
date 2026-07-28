# grain — demo

Real, unedited output of grain run on live Claude Code transcripts.
Secrets, tokens, and home paths are auto-redacted.

## `grain scan` — a brief of how the repo is really worked in

```
# Repo brief — distilled by Grain

_From 2 session(s), 2817 shell command(s) observed. This is learned from how the repo was actually worked in, not guessed._

## How this repo is tested
- `node --test`  ·  124×
- `npm test`  ·  31×
- `Run `node`  ·  23×
- `./.venv/bin/python -m`  ·  6×
- `nohup codex`  ·  2×
- `./.venv/bin/pip install`  ·  1×

## How it is built
- `curl -s`  ·  16×
- `-e 'console.log(JSON.parse(require("fs").readFileSync(process.env.HOME+"/Library/Application`  ·  13×
- `vercel deploy`  ·  12×
- `rm -rf`  ·  10×
- `npx -y`  ·  8×
- `curl -sS`  ·  6×

## How it is run
- `node bin/flywheel.js`  ·  28×
- `node capture.js`  ·  24×
- `python3 <<PY`  ·  17×
- `nice -n`  ·  12×
- `node capture.mjs`  ·  12×
```

## `grain agents` — a proposed AGENTS.md

```
# AGENTS.md — proposed by Grain

_Distilled from 2 session(s) of real agent work in this repo. These are observations to review, not gospel — keep what fits, cut what does not._

## Commands
- **Test:** `node --test`
- **Build:** `curl -s`
- **Run:** `node bin/flywheel.js`

## Conventions
- Use ESM `import`/`export`, not CommonJS `require`.
- Write tests with the built-in `node:test` runner.
- Assert with `node:assert/strict`.
- Tests are table-driven: a `cases` array with one assertion loop.
- Raise errors with `throw new Error(...)`.
- Use double quotes.
- Indent with 2 spaces.

## Watch out (paths tried and backed out)
- `~/Developer/Workspace/Claude/_launch/video/selfpatch/encode-mux.sh` was reverted 47×
- `~/Developer/Workspace/Claude/constraintguard/_video/capture.js` was reverted 43×
- `/private/tmp/claude-501/-Users-abhijitdas-Developer-Workspace-Claude/bf2ce1a4-1df1-4c4a-99f6-f355717d281a/scratchpad/factory-tick.sh` was reverted 26×
```

## `grain audit` — per-file provenance

```
# Provenance audit — who/what produced this repo

_473 file(s) touched by agent sessions · 1325 edit operation(s) · 0 file(s) trace to an Entire checkpoint/commit._

| File | Agent edits | Sessions | Commit(s) |
|---|---:|---:|---|
| `~/Developer/Workspace/Claude/_launch/launch-drafts.html` | 32 | 1 | — |
| `/private/tmp/claude-501/-Users-abhijitdas-Developer-Workspace-Claude/bf2ce1a4-1df1-4c4a-99f6-f355717d281a/scratchpad/omr-synth-demo.html` | 31 | 1 | — |
| `~/.claude/projects/-Users-abhijitdas-Developer-Workspace-Claude/memory/MEMORY.md` | 28 | 1 | — |
| `~/Developer/Workspace/Claude/_launch/video/selfpatch/anim.html` | 27 | 1 | — |
| `~/Developer/Workspace/Claude/constraintguard/site/index.html` | 26 | 1 | — |
| `~/Developer/Workspace/Claude/grain/test/grain.test.js` | 26 | 1 | — |
```

---

## `grain scan --entire` — reading Entire's captured checkpoints

The real end-to-end path. A single Claude Code session was captured by Entire in
the `purse` repo; Entire linked it to the commit it produced, and grain distilled
that session into repo context — with provenance back to the checkpoint.

```
$ entire checkpoint list
  branch       main
  checkpoints  1

● 138e19befa1b  "Add a roundToNearest(cents, step) function to src/money.j..."
  07-27 18:30 (11679e1) Add roundToNearest: round cents to the nearest step

$ entire why src/money.js
  src/money.js
  309 lines · 7% AI (21) · 93% human (288)
  Top checkpoints:
  - 138e19befa1b  21 lines · Claude Code · session ffb9b780
```

```
# Repo brief — distilled by Grain

_From 1 session(s), 2 shell command(s) observed. This is learned from how the repo was actually worked in, not guessed._

_Provenance: 1 Entire checkpoint(s) — traceable to the commits that produced them._

## How this repo is tested
- `npm test`  ·  1×

## Version control
- `git add`  ·  1×

## House conventions (from the code the agent wrote)
- **Error handling:** result-return (1/1) — e.g. `return err('not-integer')`
- **Quote style:** single (2/2)
- **Indentation:** 2-space (4/4)
```
