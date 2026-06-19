export function hashscanTransactionUrl(transactionId, network = 'testnet') {
  if (!transactionId || transactionId.startsWith('demo-')) return null;
  const net = network === 'mainnet' ? 'mainnet' : 'testnet';
  const normalized = String(transactionId).replace('@', '-');
  return `https://hashscan.io/${net}/transaction/${normalized}`;
}

export function hashscanTopicUrl(topicId, network = 'testnet') {
  if (!topicId) return null;
  const net = network === 'mainnet' ? 'mainnet' : 'testnet';
  return `https://hashscan.io/${net}/topic/${topicId}`;
}
