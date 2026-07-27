// Grain CLI. Thin orchestration over the pure core + adapters.

import { readFileSync } from 'node:fs';
import { loadAll } from '../adapters/claudecode.js';
import { distill } from '../core/distill.js';
import { renderBrief } from '../core/render/brief.js';
import { renderAgents } from '../core/render/agents.js';
import { lineDiff, renderDiff } from '../core/diff.js';

const USAGE = `grain — turn agent sessions into your repo's house rules

usage:
  grain scan   <transcript.jsonl | dir>            distill a repo brief from session logs
  grain agents <transcript.jsonl | dir> [--against AGENTS.md]
                                                   propose an AGENTS.md (diff it against an existing one)

examples:
  grain scan   ~/.claude/projects/-Users-me-Developer-myrepo/
  grain agents ~/.claude/projects/-Users-me-Developer-myrepo/ --against ./AGENTS.md
`;

export function main(argv) {
  const [cmd, target] = argv;

  if (cmd === 'scan') {
    if (!target) { process.stderr.write('grain: scan needs a path\n'); return 2; }
    process.stdout.write(renderBrief(distill(loadAll(target))));
    return 0;
  }

  if (cmd === 'agents') {
    if (!target) { process.stderr.write('grain: agents needs a path\n'); return 2; }
    const ctx = distill(loadAll(target));
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
