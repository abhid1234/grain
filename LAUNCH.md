# Launch — grain 🌾

Repo: https://github.com/abhid1234/grain

> **Before posting:** tag the Entire founder where you see `@[Entire founder]`
> (fill in their actual handle). Attach the demo output from `DEMO.md` or a
> screenshot of `examples/AGENTS.sample.md`.

---

## LinkedIn post

We keep the pull request and throw away the conversation that produced it. So I built a tool that mines the conversation instead.

I got into the beta for Entire (entire.io) — it keeps every agent-coding session linked to the commit it produced, so your history records not just *what* changed but *how* you got there. That "how" is the interesting part, and it's normally deleted the moment the PR merges.

So I built **grain** 🌾 — an open-source tool that reads those captured sessions and distills them into your repo's house rules (an AGENTS.md you can actually commit).

It pulls out four things the sessions already prove:
- **Commands** — how the repo is really tested, built, and run (learned from what you ran 100+ times, not guessed).
- **Conventions** — ESM vs CJS, which test runner, table-driven tests, return-a-Result vs throw, quote and indent style.
- **Corrections** — the redirections your reviews kept making ("no, do it this way"), surfaced as candidate preferences.
- **Dead ends** — the paths the agent tried and you backed out. This one is only possible because Entire keeps the *session*, not just the final diff. The diff can't show you what got reverted.

A few things I cared about building it:
- **Redaction first.** Session transcripts can be more sensitive than the code — reasoning, pasted data, sometimes live secrets. Nothing leaves grain's core without passing through redaction (keys, tokens, JWTs, emails, and even home-directory paths). There's a test asserting known secret shapes never survive.
- **Deterministic floor, optional LLM.** The rules are derived deterministically; an optional Claude pass can only *rephrase* them, never invent one. It runs with no API key at all.
- **Provenance.** `grain audit` shows which sessions and commits produced each file — the enterprise "where did this code come from" view. Line-level agent-vs-human share comes from Entire's own `entire why`.

It's MIT, zero-dependency, ~190 tests, and it reads Entire's checkpoints directly (or raw Claude Code transcripts, so you can try it today):

```
grain scan   --entire .    # a brief of how the repo is really worked in
grain agents --entire .    # a proposed AGENTS.md
grain audit  --entire .    # per-file provenance
```

This is a personal experiment, not an endorsement — evaluate any session-log tooling against your own security needs. But the direction feels right: if we're going to capture how agents and engineers actually build software, we should put that record to work. @[Entire founder] — this is a fun thing to build on top of what you're making.

Repo: github.com/abhid1234/grain

#ai #developertools #opensource

---

## X / short version

We keep the PR and throw away the conversation that made it.

So I built **grain** 🌾 (open source) on top of Entire (@[Entire founder]): it reads your captured agent-coding sessions and distills them into an AGENTS.md — the commands, conventions, corrections, and the dead ends the final diff can't show you.

Redaction-first, deterministic, ~190 tests.

github.com/abhid1234/grain
