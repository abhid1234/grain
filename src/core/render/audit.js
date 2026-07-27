// Render a provenance audit as a markdown report. Pure.

import { redact } from '../redact.js';

/**
 * @param {ReturnType<import('../audit.js').auditFiles>} files
 * @param {{top?:number}} [opts]
 * @returns {string}
 */
export function renderAudit(files, opts = {}) {
  const top = opts.top ?? 20;
  const out = [];
  out.push('# Provenance audit — who/what produced this repo');
  out.push('');

  if (!files.length) {
    out.push('_No agent file edits found in the given sessions._');
    return out.join('\n') + '\n';
  }

  const totalEdits = files.reduce((s, f) => s + f.edits, 0);
  const withProv = files.filter((f) => f.commits.length || f.checkpoints.length).length;
  out.push(
    `_${files.length} file(s) touched by agent sessions · ${totalEdits} edit operation(s) · ` +
      `${withProv} file(s) trace to an Entire checkpoint/commit._`,
  );
  out.push('');
  out.push('| File | Agent edits | Sessions | Commit(s) |');
  out.push('|---|---:|---:|---|');
  for (const f of files.slice(0, top)) {
    const commits = f.commits.length ? f.commits.map((c) => String(c).slice(0, 7)).join(', ') : '—';
    out.push(`| \`${redact(f.file)}\` | ${f.edits} | ${f.sessions.length} | ${commits} |`);
  }
  out.push('');
  out.push(
    '_Line-level agent-vs-human share per file comes from Entire directly ' +
      '(`entire why <file>`). Grain adds the session/commit provenance behind each file._',
  );
  return out.join('\n') + '\n';
}
