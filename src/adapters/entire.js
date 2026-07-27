// Adapter: read captured sessions from Entire (entire.io) into Grain's Session
// model, carrying provenance (checkpoint id + commit) so distilled rules can be
// traced back to the work that produced them.
//
// Entire exposes exactly what we need:
//   entire checkpoint explain --json                 -> checkpoint metadata (array)
//   entire checkpoint explain <id> --raw-transcript  -> Claude Code JSONL we already parse
//
// The pure functions (parse/normalize/checkpointToSession) are tested against
// fixtures; loadFromEntire is the impure seam that shells out to the CLI.

import { execFileSync } from 'node:child_process';
import { parseTranscript } from './claudecode.js';

/** Normalize one checkpoint envelope from Entire's --json (schema-defensive). */
export function normalizeCheckpoint(obj) {
  const o = obj || {};
  return {
    id: o.id || o.checkpointId || o.checkpoint_id || '',
    session: o.session || o.sessionId || o.session_id || '',
    commit: o.commit || o.sha || o.commitSha || o.commit_sha || '',
    intent: o.intent || o.summary || o.title || '',
    files: o.files || o.changedFiles || o.changed_files || [],
    project: o.cwd || o.project || o.repo || '',
    tokens: o.tokens ?? o.tokenCount ?? o.token_count ?? null,
  };
}

/** Parse the `--json` list output into normalized envelopes. */
export function parseCheckpointList(jsonText) {
  let data;
  try { data = JSON.parse(String(jsonText || '[]')); } catch { return []; }
  const arr = Array.isArray(data) ? data : Array.isArray(data.checkpoints) ? data.checkpoints : [];
  return arr.map(normalizeCheckpoint);
}

/** Turn a checkpoint envelope + its raw transcript into a Session with provenance. */
export function checkpointToSession(envelope, rawTranscriptText) {
  const env = envelope.id ? envelope : normalizeCheckpoint(envelope);
  return parseTranscript(rawTranscriptText, {
    id: env.session || env.id || 'entire-session',
    project: env.project || '',
    provenance: { source: 'entire', checkpoint: env.id, commit: env.commit, intent: env.intent },
  });
}

// ---- impure seam ----

function entireCmd(args, cwd) {
  try {
    return execFileSync('entire', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/**
 * Load all captured sessions from Entire for the repo at `cwd`.
 * Returns [] gracefully when Entire is absent or no checkpoints exist.
 * @param {{cwd?: string}} [opts]
 * @returns {import('../core/model.js').Session[]}
 */
export function loadFromEntire(opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const list = parseCheckpointList(entireCmd(['checkpoint', 'explain', '--json'], cwd));
  const sessions = [];
  for (const env of list) {
    if (!env.id) continue;
    const raw = entireCmd(['checkpoint', 'explain', env.id, '--raw-transcript'], cwd);
    if (!raw) continue;
    sessions.push(checkpointToSession(env, raw));
  }
  return sessions;
}
