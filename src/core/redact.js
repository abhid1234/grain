// Redaction. Session transcripts can be more sensitive than the code they
// produced — they hold reasoning, pasted data, and sometimes live secrets.
// Nothing leaves Grain's core without passing through here first. Pure.

// Known secret shapes, redacted to a labelled placeholder.
const PATTERNS = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/g, 'anthropic-key'],
  [/vcp_[A-Za-z0-9]{20,}/g, 'vercel-token'],
  [/gh[pousr]_[A-Za-z0-9]{20,}/g, 'github-token'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/g, 'slack-token'],
  [/AKIA[0-9A-Z]{16}/g, 'aws-key'],
  [/AIza[0-9A-Za-z_-]{35}/g, 'google-key'],
  [/\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g, 'telegram-token'],
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{5,}/g, 'jwt'],
  [/sk-[A-Za-z0-9]{32,}/g, 'openai-key'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, 'email'],
];

// Any assignment whose NAME looks sensitive: FOO_TOKEN=..., API_KEY: ..., etc.
const KV =
  /\b([A-Za-z0-9_]*(?:TOKEN|SECRET|KEY|PASSWORD|PASSWD|PWD|APIKEY|ACCESS[_-]?KEY|CREDENTIAL)[A-Za-z0-9_]*)(\s*[=:]\s*)["']?[^"'\s]{6,}["']?/gi;

/**
 * Scrub secrets/PII from a string.
 * @param {string} text
 * @returns {string}
 */
export function redact(text) {
  let s = String(text ?? '');
  s = s.replace(KV, (_m, name, sep) => `${name}${sep}<redacted:secret>`);
  for (const [re, label] of PATTERNS) s = s.replace(re, `<redacted:${label}>`);
  return s;
}

/** True if `text` contains something redaction would change. */
export function hasSecret(text) {
  const s = String(text ?? '');
  return redact(s) !== s;
}
