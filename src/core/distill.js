// Distill signals from many sessions into a single RepoContext.
// Pure and deterministic: same sessions in, same context out.

import { extractCommands } from './signals/commands.js';
import { extractCorrections, preferenceKey } from './signals/corrections.js';
import { extractReverts } from './signals/reverts.js';
import { extractConventions } from './signals/conventions.js';

/**
 * @typedef {Object} RepoContext
 * @property {number} sessionCount
 * @property {number} commandCount
 * @property {Record<string, {cmd:string, n:number}[]>} commands  by category, freq-sorted
 * @property {{count:number, byKind:Record<string,number>, recurring:{key:string,n:number,sample:string}[], samples:{kind:string,text:string}[]}} corrections
 */

/**
 * @param {import('./model.js').Session[]} sessions
 * @returns {RepoContext}
 */
export function distill(sessions) {
  const all = [];
  for (const s of sessions) all.push(...extractCommands(s));

  /** @type {Record<string, Map<string, number>>} */
  const byCat = {};
  for (const { canonical, category } of all) {
    (byCat[category] ||= new Map()).set(canonical, (byCat[category].get(canonical) || 0) + 1);
  }

  /** @type {Record<string, {cmd:string, n:number}[]>} */
  const commands = {};
  for (const [cat, m] of Object.entries(byCat)) {
    commands[cat] = [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([cmd, n]) => ({ cmd, n }));
  }

  // Corrections — redirections the human made after an agent action.
  const corr = [];
  for (const s of sessions) corr.push(...extractCorrections(s));
  const byKind = {};
  for (const c of corr) byKind[c.kind] = (byKind[c.kind] || 0) + 1;
  const keyMap = new Map();
  for (const c of corr) {
    const k = preferenceKey(c.text);
    if (!k) continue;
    const cur = keyMap.get(k) || { key: k, n: 0, sample: c.text };
    cur.n += 1;
    keyMap.set(k, cur);
  }
  const recurring = [...keyMap.values()]
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));

  // Reverts — paths the agent tried and abandoned.
  const rev = [];
  for (const s of sessions) rev.push(...extractReverts(s));
  const revByReason = {};
  for (const r of rev) revByReason[r.reason] = (revByReason[r.reason] || 0) + 1;
  const fileMap = new Map();
  for (const r of rev) fileMap.set(r.file, (fileMap.get(r.file) || 0) + 1);
  const revFiles = [...fileMap.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([file, n]) => ({ file, n }));

  // Conventions — house style observed in the code the agent wrote.
  const convObs = [];
  for (const s of sessions) convObs.push(...extractConventions(s));
  const dims = {};
  for (const o of convObs) {
    const d = (dims[o.dimension] ||= { counts: new Map(), example: new Map() });
    d.counts.set(o.value, (d.counts.get(o.value) || 0) + 1);
    if (o.example && !d.example.has(o.value)) d.example.set(o.value, o.example);
  }
  const conventions = {};
  for (const [dim, d] of Object.entries(dims)) {
    const values = [...d.counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, n]) => ({ value, n, example: d.example.get(value) }));
    conventions[dim] = { values, dominant: values[0] };
  }

  return {
    sessionCount: sessions.length,
    commandCount: all.length,
    commands,
    corrections: { count: corr.length, byKind, recurring, samples: corr.slice(0, 5) },
    reverts: { count: rev.length, byReason: revByReason, files: revFiles },
    conventions,
  };
}
