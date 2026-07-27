// Provenance audit: who/what produced this repo. For each file, how many agent
// edit operations touched it, across how many sessions, and — when the sessions
// came from Entire — which checkpoints/commits are behind it. The enterprise view:
// not "what does the code do" but "where did it come from." Pure over Sessions.

import { isSession } from './model.js';
import { redact } from './redact.js';

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

/**
 * @param {import('./model.js').Session[]} sessions
 * @returns {{file:string, edits:number, sessions:string[], checkpoints:string[], commits:string[]}[]}
 */
export function auditFiles(sessions) {
  const map = new Map();
  for (const s of sessions) {
    if (!isSession(s)) continue;
    const prov = s.provenance;
    for (const e of s.events) {
      if (e.kind !== 'tool' || !EDIT_TOOLS.has(e.tool)) continue;
      const f = e.input?.file_path || e.input?.notebook_path;
      if (!f) continue;
      const rec = map.get(f) || { edits: 0, sessions: new Set(), checkpoints: new Set(), commits: new Set() };
      rec.edits += 1;
      rec.sessions.add(s.id);
      if (prov?.checkpoint) rec.checkpoints.add(prov.checkpoint);
      if (prov?.commit) rec.commits.add(prov.commit);
      map.set(f, rec);
    }
  }
  return [...map.entries()]
    .map(([file, r]) => ({
      file: redact(file),
      edits: r.edits,
      sessions: [...r.sessions],
      checkpoints: [...r.checkpoints],
      commits: [...r.commits],
    }))
    .sort((a, b) => b.edits - a.edits || a.file.localeCompare(b.file));
}
