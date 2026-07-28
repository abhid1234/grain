// Grain CLI. Thin orchestration over the pure core + adapters.

import { readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadAll } from '../adapters/claudecode.js';
import { loadFromEntire } from '../adapters/entire.js';
import { distill } from '../core/distill.js';
import { renderBrief } from '../core/render/brief.js';
import { renderAgents } from '../core/render/agents.js';
import { lineDiff, renderDiff } from '../core/diff.js';
import { deriveRules } from '../core/rules.js';
import { buildRulePrompt, reconcileRules } from '../core/llm.js';
import { callAnthropic } from '../adapters/anthropic.js';
import { auditFiles } from '../core/audit.js';
import { renderAudit } from '../core/render/audit.js';

const USAGE = `grain — turn agent sessions into your repo's house rules

usage:
  grain scan   <transcript.jsonl | dir>            distill a repo brief from session logs
  grain scan   --entire [repo-dir]                 ...from Entire's captured checkpoints
  grain audit  <transcript.jsonl | dir | --entire> per-file provenance (who/what produced it)
  grain sources                                    list available Claude Code transcript dirs
  grain agents <transcript.jsonl | dir> [--against AGENTS.md] [--llm]
                                                   propose an AGENTS.md (diff it against an existing one)
  grain agents --entire [repo-dir] [--against AGENTS.md] [--llm]

  --llm    rephrase the deterministic rules with Claude (cautious-only; needs
           ANTHROPIC_API_KEY; falls back to deterministic rules without one)

examples:
  grain scan   ~/.claude/projects/-Users-me-Developer-myrepo/
  grain scan   --entire .
  grain agents ~/.claude/projects/-Users-me-Developer-myrepo/ --against ./AGENTS.md
`;

// Flags that consume the following argument (so it isn't mistaken for the path).
const VALUE_FLAGS = new Set(['--against']);

/** First positional argument after the command, ignoring flags and their values. */
export function positional(argv) {
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (VALUE_FLAGS.has(a)) { i++; continue; }
    if (a.startsWith('--')) continue;
    return a;
  }
  return undefined;
}

// Load sessions from either Entire (--entire [repo]) or raw transcripts (<path>).
function loadSessions(argv) {
  const path = positional(argv);
  if (argv.includes('--entire')) return loadFromEntire({ cwd: path || process.cwd() });
  return loadAll(path);
}

// Optionally rephrase the deterministic rules via the LLM (cautious-only).
// Falls back to the deterministic rules when there's no key or the call fails.
async function ruleSet(ctx, useLlm) {
  const rules = deriveRules(ctx);
  if (!useLlm || !rules.length) return rules;
  const text = await callAnthropic(buildRulePrompt(rules));
  if (!text) {
    process.stderr.write('grain: --llm unavailable (no ANTHROPIC_API_KEY or call failed); using deterministic rules.\n');
    return rules;
  }
  return reconcileRules(rules, text);
}

export async function main(argv) {
  const cmd = argv[0];
  const target = positional(argv);

  if (cmd === 'scan') {
    if (!target && !argv.includes('--entire')) { process.stderr.write('grain: scan needs a path\n'); return 2; }
    process.stdout.write(renderBrief(distill(loadSessions(argv))));
    return 0;
  }

  if (cmd === 'sources') {
    const base = join(homedir(), '.claude', 'projects');
    let dirs = [];
    try { dirs = readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch { dirs = []; }
    const out = ['# Grain sources — Claude Code transcript directories', ''];
    if (!dirs.length) {
      out.push(`_None found under ${base}._`);
    } else {
      for (const d of dirs) {
        let n = 0;
        try { n = readdirSync(join(base, d.name)).filter((f) => f.endsWith('.jsonl')).length; } catch { n = 0; }
        if (n) out.push(`- ${d.name}  ·  ${n} transcript(s)`);
      }
      out.push('', '_Scan one with:_ `grain scan ' + base + '/<dir>/`');
      out.push('_Or read Entire\'s captured checkpoints:_ `grain scan --entire <repo>`');
    }
    process.stdout.write(out.join('\n') + '\n');
    return 0;
  }

  if (cmd === 'audit') {
    if (!target && !argv.includes('--entire')) { process.stderr.write('grain: audit needs a path\n'); return 2; }
    process.stdout.write(renderAudit(auditFiles(loadSessions(argv))));
    return 0;
  }

  if (cmd === 'agents') {
    if (!target && !argv.includes('--entire')) { process.stderr.write('grain: agents needs a path\n'); return 2; }
    const ctx = distill(loadSessions(argv));
    const rules = await ruleSet(ctx, argv.includes('--llm'));
    const proposed = renderAgents(ctx, { rules });
    const ai = argv.indexOf('--against');
    if (ai >= 0 && argv[ai + 1]) {
      let existing = '';
      try { existing = readFileSync(argv[ai + 1], 'utf8'); } catch { existing = ''; }
      process.stdout.write(renderDiff(lineDiff(existing, proposed)));
    } else {
      process.stdout.write(proposed);
    }
    return 0;
  }

  process.stdout.write(USAGE);
  return cmd ? 1 : 0;
}
