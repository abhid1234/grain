// Adapter: read Claude Code transcripts (~/.claude/projects/**/**.jsonl) into
// Grain's normalized Session model. This is the impure seam — the only place
// that touches the filesystem and the raw record schema.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { session, ev } from '../core/model.js';

/** Pull plain text out of a content entry that may be string or block array. */
function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => c.text || '').join('\n');
  return '';
}

/**
 * Parse one transcript file into a Session.
 * @param {string} path
 * @returns {import('../core/model.js').Session}
 */
export function loadTranscript(path) {
  const id = basename(path).replace(/\.jsonl$/, '');
  const lines = readFileSync(path, 'utf8').split('\n');
  const events = [];
  let project = '';

  for (const line of lines) {
    if (!line) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (r.cwd && !project) project = r.cwd;

    const msg = r.message;
    if (!msg) continue;

    // User/assistant text may arrive as a bare string.
    if (typeof msg.content === 'string') {
      if (r.type === 'user') events.push(ev.prompt(msg.content));
      else if (r.type === 'assistant') events.push(ev.say(msg.content));
      continue;
    }
    if (!Array.isArray(msg.content)) continue;

    for (const c of msg.content) {
      switch (c.type) {
        case 'text':
          events.push(r.type === 'user' ? ev.prompt(c.text) : ev.say(c.text));
          break;
        case 'thinking':
          events.push(ev.think(c.thinking || c.text || ''));
          break;
        case 'tool_use':
          events.push(ev.tool(c.name, c.input || {}));
          break;
        case 'tool_result':
          events.push(ev.result(!c.is_error, textOf(c.content)));
          break;
        default:
          break;
      }
    }
  }
  return session(id, project, events);
}

/** Resolve a file or directory into a list of transcript paths. */
export function resolveTranscripts(target) {
  const st = statSync(target);
  if (st.isDirectory()) {
    return readdirSync(target)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => join(target, f));
  }
  return [target];
}

/** Convenience: load every transcript under a file or directory. */
export function loadAll(target) {
  return resolveTranscripts(target).map(loadTranscript);
}
