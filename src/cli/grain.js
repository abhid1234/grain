// Grain CLI. Thin orchestration over the pure core + adapters.

import { readFileSync } from 'node:fs';
import { loadAll } from '../adapters/claudecode.js';
import { loadFromEntire } from '../adapters/entire.js';
import { distill } from '../core/distill.js';
import { renderBrief } from '../core/render/brief.js';
import { renderAgents } from '../core/render/agents.js';
import { lineDiff, renderDiff } from '../core/diff.js';

const USAGE = `grain — turn agent sessions into your repo's house rules

usage:
  grain scan   <transcript.jsonl | dir>            distill a repo brief from session logs
  grain scan   --entire [repo-dir]                 ...from Entire's captured checkpoints
  grain agents <transcript.jsonl | dir> [--against AGENTS.md]
                                                   propose an AGENTS.md (diff it against an existing one)
  grain agents --entire [repo-dir] [--against AGENTS.md]

examples:
  grain scan   ~/.claude/projects/-Users-me-Developer-myrepo/
  grain scan   --entire .
  grain agents ~/.claude/projects/-Users-me-Developer-myrepo/ --against ./AGENTS.md
`;

// Load sessions from either Entire (--entire [cwd]) or raw transcripts (<path>).
function loadSessions(argv, target) {
  if (argv.includes('--entire')) {
    const cwd = target && !target.startsWith('--') ? target : process.cwd();
    return loadFromEntire({ cwd });
  }
  return loadAll(target);
}

export function main(argv) {
  const [cmd, target] = argv;

  if (cmd === 'scan') {
    if (!target && !argv.includes('--entire')) { process.stderr.write('grain: scan needs a path\n'); return 2; }
    process.stdout.write(renderBrief(distill(loadSessions(argv, target))));
    return 0;
  }

  if (cmd === 'agents') {
    if (!target && !argv.includes('--entire')) { process.stderr.write('grain: agents needs a path\n'); return 2; }
    const ctx = distill(loadSessions(argv, target));
    const proposed = renderAgents(ctx);
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
