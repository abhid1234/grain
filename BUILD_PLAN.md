# BUILD_PLAN — grain

A 10-iteration build, one per hour overnight. Each iteration is self-contained,
testable, and ends green with a commit. The autonomous loop reads this file, does
the next unchecked iteration, tests, and commits.

**House rules:** pure core / impure edges, redact everything, deterministic,
table-driven `node:test`. See [AGENTS.md](AGENTS.md).

---

- [x] **1 — Scaffold + first signal, end to end.**
  Normalized `Session` model, Claude Code transcript adapter, `commands` signal
  (test/build/run/deps/lint/vcs classification), `distill`, `renderBrief`, `grain
  scan` CLI. Secret **redaction** on all output. Runs on real transcripts. 50 tests.

- [x] **2 — Corrections signal.**
  Detect user redirections/rebukes ("no, do X", "don't…", "actually…", "revert")
  from prompt events that follow an agent action. Turn recurring corrections into
  candidate preferences. Redact. Table-driven tests + fixture. Filters harness/
  system-injected text (length cap + marker skip). 76 tests. On real transcripts:
  180 raw → 32 real redirections after noise filtering.

- [x] **3 — Reverts / dead-ends signal.**
  Finds edits undone by `git checkout`/`restore`/`reset --hard`/`stash`/`rm` — the
  paths the agent tried and abandoned. Only the session carries these. Tracks
  pending-vs-committed edits so committed work isn't counted. 100 tests. On real
  transcripts: 378 reverts (removed 248×, bulk-reset 128×, git-checkout 2×).

- [x] **4 — Conventions signal.**
  From `Write`/`Edit`/`MultiEdit` content, observe house style: module system
  (esm/cjs), test runner, assertions, table-driven test style, error handling
  (result-return vs throw), quotes, indentation. Frequency + redacted example,
  deduped per file. 120 tests. Real transcripts: esm 149/159, node:test 33/33,
  table-driven 9/9, 2-space 572/805.

- [x] **5 — RepoContext + AGENTS.md proposal.**
  `render/agents.js` turns the distilled context into a proposed AGENTS.md
  (Commands / Conventions as imperative rules / Preferences from recurring
  corrections / Watch-out anti-patterns). `grain agents <target> [--against
  AGENTS.md]` prints the proposal or a pure LCS line-diff (`core/diff.js`) against
  an existing file. 135 tests. Produces a real, usable proposal from live sessions.

- [x] **6 — Entire adapter.**
  `src/adapters/entire.js` reads captured sessions via `entire checkpoint explain
  --json` (metadata) + `--raw-transcript` (reusing the Claude Code parser) and
  normalizes to `Session` with provenance `{source, checkpoint, commit, intent}`.
  distill surfaces `sources`; the brief notes provenance. `grain scan/agents
  --entire [repo]`. Degrades gracefully to 0 sessions when no checkpoints exist.
  147 tests. (Per-rule provenance deepens in iteration 8 — grain audit.)

- [x] **7 — Optional LLM phrasing layer.**
  `grain agents --llm` rephrases the deterministic rules with Claude. Cautious-only
  by construction: `core/rules.js` derives rules with stable ids; `core/llm.js`
  builds the prompt and `reconcileRules` accepts a phrasing only for a known id,
  redacts it, and falls back to the deterministic text on anything unexpected —
  the model can never add/drop/change a rule. Impure call in `adapters/anthropic.js`
  returns null with no key, so Grain works with no key at all. 162 tests.

- [x] **8 — `grain audit` (provenance report).**
  `core/audit.js` + `render/audit.js`: per-file agent edit-op count, the sessions
  that touched it, and — with `--entire` — the checkpoints/commits behind it.
  `grain audit <target|--entire>`. Points at `entire why` for line-level share;
  Grain adds session/commit provenance. Paths redacted. 175 tests. Real
  transcripts: 472 files, 1313 edit ops.

- [x] **9 — Hardening + real output.**
  Command-noise cleanup (newline split + heredoc/loop-keyword filter — kills the
  `do cd`/`EOF node` junk). Redaction hardened: home paths collapse to `~`, plus a
  6-shape secret corpus test. New `grain sources` command; README documents all
  commands. Committed real `grain agents` output at `examples/AGENTS.sample.md`
  (0 secrets, 0 raw home paths). 190 tests. Real commands: `node --test` 122×.

- [ ] **10 — Launch.**
  README polish, a short write-up / post draft (tagging Entire's founder), a demo
  GIF or asciicast, and a tagged `v0.2.0`. Package for `npx grain`.

---

_When all boxes are checked, the loop stops (removes its own cron)._
