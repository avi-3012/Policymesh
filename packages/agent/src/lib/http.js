/**
 * Shared HTTP / JSON-RPC helpers for external service APIs.
 */
export async function fetchJson(url, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${url}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function jsonRpc(url, method, params = [], apiKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const body = await fetchJson(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });

  if (body.error) {
    throw new Error(body.error.message || JSON.stringify(body.error));
  }
  return body.result;
}

export function tokenIdToEvmAddress(tokenId) {
  const parts = String(tokenId).split('.');
  const num = BigInt(parts[2] ?? parts[parts.length - 1]);
  return `0x${num.toString(16).padStart(40, '0')}`;
}
