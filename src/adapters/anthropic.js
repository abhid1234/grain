// Adapter: the impure LLM call. Returns null when no key is configured or the
// request fails — the caller then keeps the deterministic rules (the floor), so
// Grain always works with no API key at all.

/**
 * @param {string} prompt
 * @param {{apiKey?:string, model?:string, maxTokens?:number}} [opts]
 * @returns {Promise<string|null>}
 */
export async function callAnthropic(prompt, opts = {}) {
  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const model = opts.model || process.env.GRAIN_MODEL || 'claude-haiku-4-5-20251001';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens || 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.content?.[0]?.text || null;
  } catch {
    return null;
  }
}
