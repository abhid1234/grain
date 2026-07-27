// Render a RepoContext into a human-readable brief (markdown). Pure.

import { redact } from '../redact.js';

const LABELS = {
  test: 'How this repo is tested',
  build: 'How it is built',
  run: 'How it is run',
  deps: 'Dependencies',
  lint: 'Linting / formatting',
  vcs: 'Version control',
  other: 'Other commands',
};
const ORDER = ['test', 'build', 'run', 'deps', 'lint', 'vcs', 'other'];

/**
 * @param {import('../distill.js').RepoContext} ctx
 * @param {{top?: number}} [opts]
 * @returns {string}
 */
export function renderBrief(ctx, opts = {}) {
  const top = opts.top ?? 6;
  const out = [];
  out.push('# Repo brief — distilled by Grain');
  out.push('');
  out.push(
    `_From ${ctx.sessionCount} session(s), ${ctx.commandCount} shell command(s) observed. ` +
      'This is learned from how the repo was actually worked in, not guessed._',
  );
  out.push('');
  for (const cat of ORDER) {
    const items = ctx.commands[cat];
    if (!items || !items.length) continue;
    out.push(`## ${LABELS[cat] || cat}`);
    for (const { cmd, n } of items.slice(0, top)) out.push(`- \`${redact(cmd)}\`  ·  ${n}×`);
    out.push('');
  }
  return out.join('\n').trimEnd() + '\n';
}
