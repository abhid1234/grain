// Derive imperative house-rules from a RepoContext's conventions. Pure and
// deterministic — this is the floor the (optional) LLM layer may only rephrase,
// never extend. Each rule has a stable `id` so a phrasing can be matched back.

/**
 * @param {import('./distill.js').RepoContext} ctx
 * @returns {{id:string, text:string}[]}
 */
export function deriveRules(ctx) {
  const c = ctx.conventions || {};
  const dom = (dim) => c[dim]?.dominant?.value;
  const rules = [];
  const add = (id, text) => rules.push({ id, text });

  if (dom('module')) add('module', dom('module') === 'esm'
    ? 'Use ESM `import`/`export`, not CommonJS `require`.'
    : 'Use CommonJS `require`/`module.exports`.');
  if (dom('test-runner') === 'node:test') add('test-runner', 'Write tests with the built-in `node:test` runner.');
  if (dom('assert') === 'node:assert') add('assert', 'Assert with `node:assert/strict`.');
  if (dom('test-style') === 'table-driven') add('test-style', 'Tests are table-driven: a `cases` array with one assertion loop.');
  if (dom('errors')) add('errors', dom('errors') === 'result-return'
    ? 'Return a `Result` (`ok`/`err`); do not throw from public functions.'
    : 'Raise errors with `throw new Error(...)`.');
  if (dom('quotes')) add('quotes', `Use ${dom('quotes')} quotes.`);
  if (dom('indent')) add('indent', `Indent with ${dom('indent').replace('-', ' ')}s.`);

  return rules;
}
