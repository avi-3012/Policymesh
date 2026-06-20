import { Client, PrivateKey } from '@hashgraph/sdk';
import { config } from '../config/index.js';

/**
 * Create Hedera client when credentials are configured.
 * Returns null in demo mode.
 */
export function createHederaClient() {
  if (config.demoMode) {
    return null;
  }

  const { accountId, privateKey, network } = config.hedera;
  if (!accountId || !privateKey) {
    return null;
  }

  const client =
    network === 'mainnet'
      ? Client.forMainnet()
      : network === 'previewnet'
        ? Client.forPreviewnet()
        : Client.forTestnet();

  if (privateKey.startsWith('0x')) {
    client.setOperator(accountId, PrivateKey.fromStringECDSA(privateKey));
  } else {
    try {
      client.setOperator(accountId, PrivateKey.fromStringDer(privateKey));
    } catch {
      client.setOperator(accountId, PrivateKey.fromStringECDSA(privateKey));
    }
  }
  return client;
}

export function getAgentStatus(client) {
  return {
    online: true,
    demoMode: config.demoMode,
    network: config.hedera.network,
    accountId: config.demoMode ? 'demo-account' : config.hedera.accountId,
    hederaConnected: client != null,
    hcsAuditTopicConfigured: Boolean(config.hedera.hcsAuditTopicId),
  };
}
