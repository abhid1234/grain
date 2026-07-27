// Signal: which paths did the agent try and abandon?
//
// The final diff only shows what survived. The session also shows the code that
// was written and then thrown away — a file restored with `git checkout`, an edit
// blown away by `git reset --hard`, a scratch file `rm`'d. Those abandoned paths
// are the repo's anti-patterns: "we tried it this way and backed it out." Only the
// session carries them. Pure function over a Session.

import { isSession } from '../model.js';
import { redact } from '../redact.js';

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// Order matters: bulk/whole-tree undo is checked before path-specific undo.
const UNDO = [
  ['bulk-reset', /\bgit\s+reset\s+--hard\b|\bgit\s+checkout\s+\.(?:\s|$)|\bgit\s+clean\b|\bgit\s+stash\b(?!\s+list)/],
  ['git-revert', /\bgit\s+revert\b/],
  ['git-restore', /\bgit\s+restore\b/],
  ['git-checkout', /\bgit\s+checkout\b/],
  ['removed', /\b(?:rm|git\s+rm)\b/],
];

/** @param {string} command @returns {string|null} */
export function classifyUndo(command) {
  const c = String(command || '');
  for (const [reason, re] of UNDO) if (re.test(c)) return reason;
  return null;
}

/** Crude path extraction: tokens that look like file paths, minus flags/refs/urls. */
export function pathsIn(command) {
  return String(command || '')
    .split(/\s+/)
    .map((t) => t.replace(/^['"]|['"]$/g, ''))
    .filter(
      (t) =>
        /[/.]/.test(t) &&
        t !== '.' &&
        !t.startsWith('-') &&
        !/^https?:/.test(t) &&
        !/^(HEAD|ORIG_HEAD|origin|main|master)$/.test(t),
    );
}

/** Find an edited file that the command path refers to (basename or suffix match). */
function findEdited(everEdited, p) {
  if (everEdited.has(p)) return p;
  const base = p.split('/').pop();
  for (const f of everEdited.keys()) {
    if (f === p || f.endsWith(`/${p}`) || p.endsWith(`/${f}`) || f.split('/').pop() === base) return f;
  }
  return null;
}

/**
 * @param {import('../model.js').Session} sessionObj
 * @returns {{file:string, reason:string}[]}
 */
export function extractReverts(sessionObj) {
  if (!isSession(sessionObj)) return [];
  const everEdited = new Map(); // file -> first index (kept for the whole session)
  let pending = []; // files edited since the last commit
  const out = [];
  let i = 0;

  for (const e of sessionObj.events) {
    i += 1;
    if (e.kind === 'tool' && EDIT_TOOLS.has(e.tool)) {
      const f = e.input?.file_path || e.input?.notebook_path;
      if (f) {
        if (!everEdited.has(f)) everEdited.set(f, i);
        if (!pending.includes(f)) pending.push(f);
      }
      continue;
    }
    if (e.kind !== 'tool' || e.tool !== 'Bash') continue;
    const cmd = String(e.input?.command || '');

    if (/\bgit\s+commit\b/.test(cmd)) { pending = []; continue; } // committed work isn't abandoned

    const reason = classifyUndo(cmd);
    if (!reason) continue;

    if (reason === 'bulk-reset') {
      if (pending.length) for (const f of pending) out.push({ file: f, reason });
      else out.push({ file: '(uncommitted changes)', reason });
      pending = [];
    } else if (reason === 'git-revert') {
      out.push({ file: '(a prior commit)', reason });
    } else {
      for (const p of pathsIn(cmd)) {
        const match = findEdited(everEdited, p);
        if (match) out.push({ file: match, reason });
      }
    }
  }
  return out.map((r) => ({ file: redact(r.file), reason: r.reason }));
}
