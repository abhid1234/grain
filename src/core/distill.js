// Distill signals from many sessions into a single RepoContext.
// Pure and deterministic: same sessions in, same context out.

import { extractCommands } from './signals/commands.js';

/**
 * @typedef {Object} RepoContext
 * @property {number} sessionCount
 * @property {number} commandCount
 * @property {Record<string, {cmd:string, n:number}[]>} commands  by category, freq-sorted
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

  return { sessionCount: sessions.length, commandCount: all.length, commands };
}
