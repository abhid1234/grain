// Grain CLI. Thin orchestration over the pure core + adapters.

import { loadAll } from '../adapters/claudecode.js';
import { distill } from '../core/distill.js';
import { renderBrief } from '../core/render/brief.js';

const USAGE = `grain — turn agent sessions into your repo's house rules

usage:
  grain scan <transcript.jsonl | dir>   distill a repo brief from session logs

examples:
  grain scan ~/.claude/projects/-Users-me-Developer-myrepo/
`;

export function main(argv) {
  const [cmd, target] = argv;
  if (cmd === 'scan') {
    if (!target) { process.stderr.write('grain: scan needs a path\n'); return 2; }
    const sessions = loadAll(target);
    process.stdout.write(renderBrief(distill(sessions)));
    return 0;
  }
  process.stdout.write(USAGE);
  return cmd ? 1 : 0;
}
