// Signal: what conventions does the code in this repo follow?
//
// Every Write/Edit is a sample of house style. Across a session they reveal the
// repo's real conventions — ESM vs CJS, which test runner, Result-returns vs
// throws, quote and indent style — the things you'd otherwise hand-write into
// AGENTS.md and hope you got right. Pure function over a Session.

import { isSession } from '../model.js';
import { redact } from '../redact.js';

/** Pull the code strings an agent wrote/edited, with their file. */
function contentsOf(sessionObj) {
  const out = [];
  for (const e of sessionObj.events) {
    if (e.kind !== 'tool') continue;
    const f = e.input?.file_path || '';
    if (e.tool === 'Write' && e.input?.content) out.push({ file: f, code: String(e.input.content) });
    else if (e.tool === 'Edit' && e.input?.new_string) out.push({ file: f, code: String(e.input.new_string) });
    else if (e.tool === 'MultiEdit' && Array.isArray(e.input?.edits)) {
      for (const ed of e.input.edits) if (ed?.new_string) out.push({ file: f, code: String(ed.new_string) });
    }
  }
  return out;
}

function firstMatch(code, re) {
  const m = re.exec(code);
  return m ? m[0].trim().replace(/\s+/g, ' ').slice(0, 80) : undefined;
}

/**
 * Observe conventions in a single code string. Deduped by dimension+value.
 * @param {string} code
 * @returns {{dimension:string, value:string, example?:string}[]}
 */
export function observe(code) {
  const c = String(code || '');
  const obs = [];
  const add = (dimension, value, example) => obs.push({ dimension, value, example });

  if (/^\s*import\s[^\n]*\sfrom\s+['"]/m.test(c)) add('module', 'esm', firstMatch(c, /^\s*import\s[^\n]*from\s+['"][^'"]+['"]/m));
  if (/\brequire\(\s*['"]/.test(c)) add('module', 'cjs', firstMatch(c, /\brequire\(\s*['"][^'"]+['"]\)/));

  if (/from\s+['"]node:test['"]/.test(c)) add('test-runner', 'node:test', firstMatch(c, /import[^\n]*node:test['"]/));
  if (/from\s+['"](?:vitest|mocha)['"]|@jest\/globals/.test(c)) add('test-runner', 'third-party');

  if (/from\s+['"]node:assert/.test(c)) add('assert', 'node:assert', firstMatch(c, /import[^\n]*node:assert[^\n]*/));

  if (/\bconst\s+cases\s*=\s*\[/.test(c)) add('test-style', 'table-driven', firstMatch(c, /const\s+cases\s*=\s*\[/));

  if (/\breturn\s+err\(/.test(c)) add('errors', 'result-return', firstMatch(c, /return\s+err\([^)]*\)/));
  if (/\bthrow\s+new\s+\w*Error/.test(c)) add('errors', 'throw', firstMatch(c, /throw\s+new\s+\w*Error[^;\n]*/));

  const sq = (c.match(/'/g) || []).length;
  const dq = (c.match(/"/g) || []).length;
  if (sq + dq >= 4) add('quotes', sq >= dq ? 'single' : 'double');

  const indented = c.split('\n').filter((l) => /^\s+\S/.test(l));
  if (indented.length) {
    const tabs = indented.filter((l) => /^\t/.test(l)).length;
    const twos = indented.filter((l) => /^ {2}\S/.test(l)).length;
    const fours = indented.filter((l) => /^ {4}\S/.test(l)).length;
    const m = Math.max(tabs, twos, fours);
    if (m > 0) add('indent', tabs === m ? 'tab' : twos >= fours ? '2-space' : '4-space');
  }

  const seen = new Set();
  const uniq = [];
  for (const o of obs) {
    const k = `${o.dimension}:${o.value}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push({ dimension: o.dimension, value: o.value, example: o.example ? redact(o.example) : undefined });
  }
  return uniq;
}

/**
 * @param {import('../model.js').Session} sessionObj
 * @returns {{dimension:string, value:string, example?:string}[]}
 */
export function extractConventions(sessionObj) {
  if (!isSession(sessionObj)) return [];
  const out = [];
  for (const { code } of contentsOf(sessionObj)) out.push(...observe(code));
  return out;
}
