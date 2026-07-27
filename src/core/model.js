// Grain's normalized session model. Pure, zero-dependency.
//
// Every source (Claude Code transcripts, Entire checkpoints, ...) is normalized
// into a Session — an ordered list of Events — so the signal extractors never
// have to know where the data came from.

/**
 * @typedef {Object} Session
 * @property {string} id        stable id (transcript/session id)
 * @property {string} project   cwd / repo the session ran in
 * @property {Event[]} events   ordered events
 *
 * @typedef {(
 *   {kind:'prompt', text:string} |
 *   {kind:'think',  text:string} |
 *   {kind:'say',    text:string} |
 *   {kind:'tool',   tool:string, input:object} |
 *   {kind:'result', ok:boolean, text:string}
 * )} Event
 */

/** @param {string} id @param {string} project @param {Event[]} events @returns {Session} */
export function session(id, project = '', events = []) {
  return { id, project, events };
}

export const isSession = (s) =>
  s && typeof s.id === 'string' && Array.isArray(s.events);

/** Event constructors — the only place event shapes are defined. */
export const ev = {
  prompt: (text) => ({ kind: 'prompt', text: String(text || '') }),
  think: (text) => ({ kind: 'think', text: String(text || '') }),
  say: (text) => ({ kind: 'say', text: String(text || '') }),
  tool: (tool, input) => ({ kind: 'tool', tool: String(tool || ''), input: input || {} }),
  result: (ok, text) => ({ kind: 'result', ok: Boolean(ok), text: String(text || '') }),
};

/** Filter a session's events by kind (and optional tool name). */
export function eventsOf(sessionObj, kind, tool) {
  if (!isSession(sessionObj)) return [];
  return sessionObj.events.filter(
    (e) => e.kind === kind && (tool === undefined || e.tool === tool),
  );
}
