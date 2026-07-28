# Launch — grain 🌾

Repo: https://github.com/abhid1234/grain

**Assets (full paths):**
- Video (use this one): `/Users/abhijitdas/Developer/Workspace/Claude/grain/_video/grain-demo-v2.mp4`
  — themed CRT/phosphor terminal demo, narrated, 2:13, square 1080
- Poster: `/Users/abhijitdas/Developer/Workspace/Claude/grain/_video/grain-demo-v2-poster.jpg`
- Blog / long-form: `/Users/abhijitdas/Developer/Workspace/Claude/grain/BLOG.md`
- Earlier cuts: `grain-terminal-narrated.mp4` (plain theme), `grain-terminal-demo.mp4` (silent), `grain-explainer.mp4` (slides)

> **Before posting:** tag Entire's founder / the Entire company page where you see
> `@Entire`. Attach the narrated terminal demo.

**Structure (same as the video):** problem → applied for access → got in → started
using it → what I discovered → what I built → thanks to the team.

---

## LinkedIn post

Every coding agent I use is brilliant and completely amnesiac.

It writes the code, I correct it, we go back and forth, and I steer it away from the three things that don't work in this repo. Then the pull request merges — and that whole conversation disappears. All that survives is the diff. Next session, the agent starts from zero and I teach it the same things again.

That's the problem Entire (entire.io) is going after — and it's two bets, not one.

**The session layer:** every agent session stored in your repo. A checkpoint for every commit. Context that's attached, not archived. Which unlocks reviewing the *intent* rather than just the diff, searching code and sessions together, and resuming work across any agent with full session state.

**The distributed git network:** this is the half I under-appreciated at first. Entire mirrors your repo across regions — US East, EU Central, Australia — for agent throughput, and every clone carries its checkpoints and session history at shallow-clone speed.

And to be precise about it: **it's not a GitHub replacement.** Their own instruction is "keep the repo on GitHub — one command creates a regional mirror." GitHub is built for a world where humans write the commits. Entire is built for one where agents write a lot of them, so the unit of history becomes the diff *plus the conversation that produced it* — distributed so a fleet of agents can pull it fast.

I joined their waitlist on July 9th. On the 15th I got the email — *"You're in. Let the rebellion begin."* — so I spent this week actually using it on a small library I've been building.

**What I found:**

I enabled it, then asked a simple question: who wrote this file? `entire why src/money.js` → 288 lines, 0% AI, 100% human.

Then I let Claude Code add a feature. The moment the session started, Entire told me it would link the conversation to my next commit. It did — one checkpoint, tied to commit `11679e1`, holding the entire session that produced it.

Then I asked the same question again:

**309 lines · 7% AI (21) · 93% human**

Twenty-one lines, and every one traces back to the prompt that created it. That's an audit trail I've never had before. Not "an AI touched this file" — *this* prompt produced *these* lines, in *this* session, on *this* commit.

**So I built something on top of it.**

It's called **grain** — open source, MIT. It reads those captured sessions and distills them into the repo's house rules.

From a single captured session, it worked out how the repo is tested, that errors return a Result instead of throwing, the quote style, the indentation. Nobody wrote any of that down. It learned it by watching the work happen. Then it proposes the actual AGENTS.md — the file the next agent reads before it writes a line — plus an audit view of which sessions and commits produced each file.

```
grain scan   --entire .    # how the repo is really worked in
grain agents --entire .    # a proposed AGENTS.md
grain audit  --entire .    # per-file provenance
```

**Why I think this direction matters:** context in AI-assisted engineering is project-specific. An agent excels when it learns how to code in *your* repo, not in the abstract. AGENTS.md and skills carry that context, but writing them is guesswork — you do it *before* you've watched an agent work. Captured sessions flip that around: the rules get written from evidence.

One thing worth saying plainly: session transcripts can be more sensitive than the code they produced — reasoning, pasted data, sometimes secrets. Entire redacts secrets before storage and keeps the metadata on a branch inside your own repo, which is a sane starting posture. grain extends that same care to its own output; nothing leaves its core unredacted, and there's a test asserting known secret shapes never survive.

Big thanks to the @Entire team for building something genuinely different. This is early, and I'm one user with one week on it — but it's the first tool that made my agents' history feel like an asset instead of exhaust.

grain is open source if you want to pull it apart: github.com/abhid1234/grain

#ai #developertools #opensource

---

## X / short version

Every coding agent I use is brilliant and completely amnesiac. The PR merges and the conversation that produced it is deleted.

@Entire fixes that — every agent session stored in your repo, a checkpoint for every commit, mirrored across regions for agent throughput. Not a GitHub replacement: you keep your repo and it mirrors it.

Got off the waitlist last week. `entire why src/money.js` → **309 lines · 7% AI (21) · 93% human**, every AI line traced to the prompt that wrote it.

So I built **grain** 🌾 on top: it reads those sessions and distills them into your repo's house rules (a committable AGENTS.md).

Open source: github.com/abhid1234/grain

---

## Blog / newsletter version

Full long-form post at `/Users/abhijitdas/Developer/Workspace/Claude/grain/BLOG.md`
— same narrative arc, ~1,200 words: the amnesia problem → what Entire is going
after (their own words) → waitlist Jul 9 / access Jul 15 → the 0% → 7% discovery →
what I built and the four signals → why it's a loop → the redaction caveat →
thanks to the team.

Title: **"Every coding agent I use is brilliant — and completely amnesiac"**

## Comment to drop under your own post (LinkedIn rewards this)

The part I keep coming back to: a diff can only show you what survived. What got
reverted — the approach you tried and backed out — exists only in the session.
That's the signal grain's "dead ends" detector reads, and it's simply not
recoverable from git history alone.
