// A tiny, dependency-free line diff (LCS). Pure and deterministic — used to show
// a proposed AGENTS.md against a repo's existing one.

/**
 * @param {string} a  existing text
 * @param {string} b  proposed text
 * @returns {{type:'common'|'added'|'removed', line:string}[]}
 */
export function lineDiff(a, b) {
  const A = String(a || '').split('\n');
  const B = String(b || '').split('\n');
  const n = A.length;
  const m = B.length;
  // dp[i][j] = LCS length of A[i:], B[j:]
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push({ type: 'common', line: A[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'removed', line: A[i] }); i++; }
    else { out.push({ type: 'added', line: B[j] }); j++; }
  }
  while (i < n) out.push({ type: 'removed', line: A[i++] });
  while (j < m) out.push({ type: 'added', line: B[j++] });
  return out;
}

export function summarizeDiff(diff) {
  return {
    added: diff.filter((d) => d.type === 'added').length,
    removed: diff.filter((d) => d.type === 'removed').length,
    common: diff.filter((d) => d.type === 'common').length,
  };
}

/** Render a diff as +/- lines (only the changes), with a one-line summary. */
export function renderDiff(diff) {
  const out = [];
  for (const d of diff) {
    if (d.type === 'added') out.push(`+ ${d.line}`);
    else if (d.type === 'removed') out.push(`- ${d.line}`);
  }
  const s = summarizeDiff(diff);
  out.push('');
  out.push(`# ${s.added} line(s) proposed to add · ${s.removed} in existing but not proposed.`);
  return out.join('\n') + '\n';
}
