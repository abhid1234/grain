# Launch — grain 🌾

**Live:** https://abhid.substack.com/p/every-coding-agent-i-use-is-brilliant
**Repo:** https://github.com/abhid1234/grain

**Assets (full paths):**
- Posts kit (open in browser, click to copy): `/Users/abhijitdas/Developer/Workspace/Claude/grain/_launch/launch-posts.html`
- Video: `/Users/abhijitdas/Developer/Workspace/Claude/grain/_video/grain-demo-v3.mp4` (2:36, narrated)
- Poster: `/Users/abhijitdas/Developer/Workspace/Claude/grain/_video/grain-demo-v3-poster.jpg`
- Blog source: `/Users/abhijitdas/Developer/Workspace/Claude/grain/_launch/blog-substack.html`

> Tag Entire where you see `@Entire`. Attach the video to the LinkedIn post.

---

## LinkedIn

Every coding agent I use is brilliant and completely amnesiac.

It writes code, I correct it, we go back and forth. Then the PR merges and that whole conversation is gone. Next session it starts from zero and I teach it the same things again.

Entire (entire.io) keeps it. Every agent session gets stored in your repo, linked to the commit it produced. It's not a GitHub replacement — your repo stays where it is and Entire mirrors it across regions.

I got off their waitlist last week. Ran one session on a small library, then asked the file who wrote it:

309 lines · 7% AI (21) · 93% human

Twenty-one lines, each traceable to the prompt behind it.

So I built grain on top. It reads those sessions and writes your repo's house rules — the test command, the conventions, the things you keep correcting. Open source.

Code: github.com/abhid1234/grain
Writeup: abhid.substack.com/p/every-coding-agent-i-use-is-brilliant

---

## X — single post

Every coding agent I use is brilliant and completely amnesiac.

The PR merges and the conversation that produced it is deleted.

@Entire keeps it — every session linked to its commit:

entire why src/money.js
→ 309 lines · 7% AI (21) · 93% human

So I built grain to read those sessions:
github.com/abhid1234/grain

---

## X — thread (if you'd rather)

**1/**
Every coding agent I use is brilliant and completely amnesiac.

It writes code, I correct it, the PR merges, and that conversation is gone. Next session starts from zero.

**2/**
@Entire keeps it. Every agent session stored in your repo, linked to the commit it produced.

Not a GitHub replacement — your repo stays put, Entire mirrors it across regions so clones carry the session history at shallow-clone speed.

**3/**
Ran one session on a small library, then asked the file who wrote it:

entire why src/money.js
→ 309 lines · 7% AI (21) · 93% human

21 lines, each traceable to the prompt behind it.

**4/**
So I built grain: it reads those captured sessions and writes your repo's house rules — test command, conventions, the things you keep correcting.

Open source: github.com/abhid1234/grain
Writeup: abhid.substack.com/p/every-coding-agent-i-use-is-brilliant

---

## First comment (post this under your own LinkedIn post)

The bit I keep coming back to: a diff only shows what survived. The approach you tried and backed out of exists nowhere in git history — only in the session. That's the signal grain reads that nothing else can.
