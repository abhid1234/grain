// Signal: what did the human keep correcting?
//
// A prompt that FOLLOWS an agent action and carries a corrective cue ("no…",
// "don't…", "actually…", "revert…") is a redirection — the engineer steering the
// agent back on course. These are the highest-value, lowest-visibility signal:
// they never survive into the final diff, only into the session. Recurring ones
// are candidate house-rule preferences. Pure function over a Session.

import { isSession } from '../model.js';
import { redact } from '../redact.js';

// Ordered — first match wins, most specific first.
const CUES = [
  ['revert', /\b(revert|undo|roll\s?back|take that back|remove that|get rid of|back out)\b/i],
  ['negation', /\b(do ?n['’]?t|do not|never|no need|avoid|that['’]?s wrong|it['’]?s wrong|not what i|not like that|incorrect|stop (doing|using))\b/i],
  ['redirect', /\b(actually|instead|rather|should be|change (it|that) to|i prefer|make it|use\b.+\bnot\b)\b/i],
  ['no-lead', /^\s*(no|nope|nah)[\s,.!:-]/i],
];

/** @param {string} text @returns {string|null} */
export function classifyCorrection(text) {
  const t = String(text || '');
  for (const [kind, re] of CUES) if (re.test(t)) return kind;
  return null;
}

// Harness/system-injected prompts that aren't human redirections.
const NOISE =
  /local-command-caveat|BUILD TICK|RESEARCH LOOP|session is being continued|autonomous (overnight|background)|do not ask questions|<[a-z-]+>|system-reminder/i;

/** A real correction is short and human — filter out long injected blocks. */
export function isNoise(text) {
  const t = String(text || '');
  return t.length > 240 || NOISE.test(t);
}

/**
 * Normalize a correction into a grouping key so recurring ones collapse:
 * redacted, lowercased, punctuation-stripped, first 6 words.
 * @param {string} text
 */
export function preferenceKey(text) {
  return redact(String(text || ''))
    .toLowerCase()
    .replace(/['’]/g, '')          // don't -> dont (fold contractions, don't split them)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 6)
    .join(' ');
}

/**
 * @param {import('../model.js').Session} sessionObj
 * @returns {{kind:string, text:string}[]}
 */
export function extractCorrections(sessionObj) {
  if (!isSession(sessionObj)) return [];
  const out = [];
  let sawAgentAction = false;
  for (const e of sessionObj.events) {
    if (e.kind === 'tool' || e.kind === 'say') { sawAgentAction = true; continue; }
    if (e.kind !== 'prompt') continue;
    if (!sawAgentAction) continue; // the opening ask is not a correction
    if (isNoise(e.text)) continue; // skip harness/system-injected blocks
    const kind = classifyCorrection(e.text);
    if (!kind) continue;
    out.push({ kind, text: redact(e.text).replace(/\s+/g, ' ').trim().slice(0, 160) });
  }
  return out;
}
