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

  const c = ctx.corrections;
  if (c && c.count > 0) {
    out.push('## What reviewers kept correcting');
    const kinds = Object.entries(c.byKind).sort((a, b) => b[1] - a[1]);
    out.push(
      `_${c.count} redirection(s): ` + kinds.map(([k, n]) => `${k} ${n}×`).join(', ') + '._',
    );
    out.push('');
    if (c.recurring.length) {
      out.push('Recurring — worth writing into AGENTS.md:');
      for (const r of c.recurring.slice(0, top)) out.push(`- “${redact(r.sample)}”  ·  ${r.n}×`);
    } else {
      out.push('Recent redirections:');
      for (const s of c.samples.slice(0, top)) out.push(`- _(${s.kind})_ “${redact(s.text)}”`);
    }
    out.push('');
  }

  const r = ctx.reverts;
  if (r && r.count > 0) {
    out.push('## Paths tried and abandoned (dead ends)');
    const reasons = Object.entries(r.byReason).sort((a, b) => b[1] - a[1]);
    out.push(
      `_${r.count} revert(s): ` + reasons.map(([k, n]) => `${k} ${n}×`).join(', ') +
        '. The final diff cannot show these — only the session can._',
    );
    out.push('');
    for (const { file, n } of r.files.slice(0, top)) out.push(`- \`${redact(file)}\`  ·  ${n}×`);
    out.push('');
  }

  return out.join('\n').trimEnd() + '\n';
}
