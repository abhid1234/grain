// The optional LLM phrasing layer — pure and cautious-only.
//
// The deterministic rules (rules.js) are the floor. The LLM may only REPHRASE
// them; it can never add, drop, or change the meaning of a rule. buildRulePrompt
// constructs the request; reconcileRules validates the reply against the known
// rule ids and falls back to the deterministic text on anything unexpected. The
// actual network call is an injected side effect (see adapters/anthropic.js),
// so this module stays pure and testable.

import { redact } from './redact.js';

/**
 * @param {{id:string, text:string}[]} rules
 * @returns {string}
 */
export function buildRulePrompt(rules) {
  const ids = rules.map((r) => r.id);
  return [
    'You are refining a project AGENTS.md. Below are house-style rules ALREADY derived',
    "deterministically from a repo's real coding sessions.",
    '',
    'Rephrase each rule to read clearly and concisely. You MUST NOT add new rules, remove',
    'rules, or change any rule\'s meaning — only improve the wording. Keep it short.',
    '',
    `Return ONLY a JSON object mapping each rule id to its rephrased text. Use exactly these ids: ${ids.join(', ')}.`,
    '',
    'Rules:',
    ...rules.map((r) => `- [${r.id}] ${r.text}`),
  ].join('\n');
}

function extractJson(text) {
  const s = String(text || '');
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  return i >= 0 && j > i ? s.slice(i, j + 1) : '{}';
}

/**
 * Merge an LLM reply back onto the deterministic rules. Cautious: a phrasing is
 * accepted only for a known id, only if it is a non-empty string of sane length;
 * invented ids are ignored; any failure falls back to the deterministic text.
 * @param {{id:string, text:string}[]} rules
 * @param {string} llmText
 * @returns {{id:string, text:string}[]}
 */
export function reconcileRules(rules, llmText) {
  let map = {};
  try {
    const parsed = JSON.parse(extractJson(llmText));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) map = parsed;
  } catch {
    map = {};
  }
  return rules.map((r) => {
    const v = map[r.id];
    if (typeof v === 'string') {
      const t = redact(v.trim());
      if (t && t.length <= 200) return { id: r.id, text: t };
    }
    return r; // floor: deterministic text wins on anything unexpected
  });
}
