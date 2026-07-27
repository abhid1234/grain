// Signal: what commands does this repo actually run on?
//
// The single most useful piece of project-specific context an agent can have is
// "how do I test / build / run this repo" — and the sessions know, because the
// engineer ran those commands over and over. Pure function over a Session.

import { eventsOf } from '../model.js';
import { redact } from '../redact.js';

// Ordered — first match wins, so put specific before generic.
const CLASSIFIERS = [
  ['test', /\bnode\s+--test\b|\bnpm\s+(run\s+)?test\b|\b(jest|vitest|mocha|pytest|ava|tap)\b/],
  ['lint', /\b(eslint|prettier|ruff|biome)\b|\btsc\s+--noemit\b/],
  ['build', /\bnpm\s+run\s+build\b|\b(tsc|vite\s+build|webpack|rollup|esbuild|make)\b|\bvercel\b/],
  ['deps', /\bnpm\s+(ci|install|i)\b|\b(yarn|pnpm)\s+(add|install|i)\b|\bpip\s+install\b|\bbrew\s+install\b/],
  ['vcs', /\bgit\s+\w/],
  ['run', /\bnode\s+[^-]|\bpython3?\s+[^-]|\bnpm\s+start\b/],
];

const ENV_ASSIGN = /^[A-Za-z_][A-Za-z0-9_]*=/;
const NOISE = /^(cd|export|source|set|unset|echo|:)\b/;

/** Split a compound command into its individual segments. */
function segments(command) {
  return String(command)
    .split(/&&|\|\||;|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Strip `sudo` and leading `FOO=bar` env assignments from a segment. */
function strip(seg) {
  const toks = seg.replace(/^sudo\s+/, '').split(/\s+/);
  let i = 0;
  while (i < toks.length && ENV_ASSIGN.test(toks[i])) i++;
  return toks.slice(i).join(' ');
}

/**
 * The meaningful part of a (possibly compound) command: skip `cd`/`export`/etc.
 * and prefer a segment that classifies to a real category.
 */
export function meaningful(command) {
  const segs = segments(command).map(strip).filter(Boolean);
  for (const seg of segs) if (!NOISE.test(seg) && classifySeg(seg) !== 'other') return seg;
  for (const seg of segs) if (!NOISE.test(seg)) return seg;
  return segs[0] || String(command);
}

function classifySeg(seg) {
  for (const [cat, re] of CLASSIFIERS) if (re.test(seg)) return cat;
  return 'other';
}

/** Category of a command, judged on its meaningful segment. */
export function classify(command) {
  return classifySeg(meaningful(command));
}

/** Canonicalize to leading verb+object (redacted) so frequencies collapse. */
export function canonical(command) {
  return redact(meaningful(command)).trim().split(/\s+/).slice(0, 2).join(' ');
}

/**
 * @param {import('../model.js').Session} sessionObj
 * @returns {{command:string, canonical:string, category:string}[]}
 */
export function extractCommands(sessionObj) {
  return eventsOf(sessionObj, 'tool', 'Bash')
    .map((e) => String(e.input?.command || ''))
    .filter(Boolean)
    .map((command) => ({
      command: redact(command),
      canonical: canonical(command),
      category: classify(command),
    }));
}
