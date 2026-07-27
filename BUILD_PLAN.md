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

- [ ] **6 — Entire adapter.**
  Read captured sessions from Entire (`entire checkpoint list/explain`, the
  `entire/checkpoints/v1` ref) and normalize to `Session`. Attach provenance:
  each distilled rule links back to the checkpoint/commit it came from.

- [ ] **7 — Optional LLM phrasing layer.**
  `grain scan --llm` uses Claude to turn deterministic signals into clean prose
  rules. Cautious-only: it may phrase or merge, never invent. Works with no key
  (deterministic templates are the floor). Reuse the Owl/Sentinel llm seam.

- [ ] **8 — `grain audit` (provenance report).**
  Who/what produced this repo: per-file agent-vs-human line share and the sessions
  behind each region — the enterprise-facing view. Builds on the Entire adapter.

- [ ] **9 — Hardening + real output.**
  Redaction test corpus, PII options, CLI polish (`grain sources`), CI matrix,
  examples. Run grain on `purse` + `sentinel` and commit a real sample proposed
  `AGENTS.md` under `examples/`.

- [ ] **10 — Launch.**
  README polish, a short write-up / post draft (tagging Entire's founder), a demo
  GIF or asciicast, and a tagged `v0.2.0`. Package for `npx grain`.

---

_When all boxes are checked, the loop stops (removes its own cron)._
