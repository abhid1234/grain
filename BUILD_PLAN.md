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

- [ ] **3 — Reverts / dead-ends signal.**
  Find edits that a later edit or `git revert`/`checkout` undid — the paths the
  agent tried and abandoned. These are anti-patterns worth writing down. This is
  the signal only the *session* (not the final diff) can provide.

- [ ] **4 — Conventions signal.**
  From `Write`/`Edit` events, extract repeated code shapes: import styles, test
  scaffolding, error-handling idioms, file/dir naming. Frequency + example.

- [ ] **5 — RepoContext + AGENTS.md proposal.**
  Combine all signals into a structured `RepoContext` (commands, conventions,
  preferences, anti-patterns, hot files). Render a proposed `AGENTS.md` and diff
  it against the repo's existing one (`grain agents`).

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
