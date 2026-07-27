// Distill signals from many sessions into a single RepoContext.
// Pure and deterministic: same sessions in, same context out.

import { extractCommands } from './signals/commands.js';
import { extractCorrections, preferenceKey } from './signals/corrections.js';

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

  return {
    sessionCount: sessions.length,
    commandCount: all.length,
    commands,
    corrections: { count: corr.length, byKind, recurring, samples: corr.slice(0, 5) },
  };
}
