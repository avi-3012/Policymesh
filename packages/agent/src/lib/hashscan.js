/**
 * HashScan explorer URLs for Hedera testnet/mainnet.
 */
export function getHashscanNetwork(network = 'testnet') {
  if (network === 'mainnet') return 'mainnet';
  if (network === 'previewnet') return 'previewnet';
  return 'testnet';
}

export function hashscanTransactionUrl(transactionId, network = 'testnet') {
  if (!transactionId) return null;
  const net = getHashscanNetwork(network);
  const normalized = String(transactionId).replace('@', '-');
  return `https://hashscan.io/${net}/transaction/${normalized}`;
}

export function hashscanTopicUrl(topicId, network = 'testnet') {
  if (!topicId) return null;
  return `https://hashscan.io/${getHashscanNetwork(network)}/topic/${topicId}`;
}

export function hashscanAccountUrl(accountId, network = 'testnet') {
  if (!accountId) return null;
  return `https://hashscan.io/${getHashscanNetwork(network)}/account/${accountId}`;
}
