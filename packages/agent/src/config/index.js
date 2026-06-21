import dotenv from 'dotenv';

dotenv.config();

const demoMode =
  process.env.DEMO_MODE === 'true' || !process.env.HEDERA_ACCOUNT_ID;

function parseAllowedProviders() {
  const base = ['f01234', 'f05678', 'akash-provider-1', 'akash-gpu-1'];
  const fromEnv = [
    process.env.ALLOWED_PROVIDER_1,
    process.env.ALLOWED_PROVIDER_2,
    process.env.ALLOWED_PROVIDER_3,
  ].filter(Boolean);

  if (process.env.ALLOWED_PROVIDERS) {
    fromEnv.push(
      ...process.env.ALLOWED_PROVIDERS.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  return [...new Set([...base, ...fromEnv])];
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  demoMode,
  hedera: {
    network: process.env.HEDERA_NETWORK || 'testnet',
    accountId: process.env.HEDERA_ACCOUNT_ID,
    privateKey: process.env.HEDERA_PRIVATE_KEY,
    hcsAuditTopicId: process.env.HCS_AUDIT_TOPIC_ID,
    hcsReputationTopicId: process.env.HCS_REPUTATION_TOPIC_ID,
    rpcUrl:
      process.env.HEDERA_RPC_URL ||
      `https://${process.env.HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'}.hashio.io/api`,
  },
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  services: {
    /** When false, Filecoin/Akash/SaucerSwap use simulation only */
    liveEnabled: process.env.SERVICES_LIVE_MODE !== 'false' && !demoMode,
    filecoin: {
      rpcUrl:
        process.env.FILECOIN_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1',
      apiKey: process.env.FILECOIN_API_KEY || null,
    },
    akash: {
      consoleApiUrl:
        process.env.AKASH_CONSOLE_API_URL || 'https://console-api.akash.network',
      apiKey: process.env.AKASH_API_KEY || null,
      network: process.env.AKASH_NETWORK || 'mainnet',
    },
    saucerswap: {
      rpcUrl: process.env.SAUCERSWAP_RPC_URL || 'https://testnet.hashio.io/api',
      routerId: process.env.SAUCERSWAP_ROUTER_ID || '0.0.19264',
      quoterId: process.env.SAUCERSWAP_QUOTER_ID || '0.0.1390002',
      whbarTokenId: process.env.SAUCERSWAP_WHBAR_TOKEN_ID || '0.0.15058',
      usdcTokenId: process.env.USDC_TOKEN_ID || '0.0.429274',
      apiKey: process.env.SAUCERSWAP_API_KEY || null,
    },
    priceOracle: {
      coingeckoUrl: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
      apiKey: process.env.COINGECKO_API_KEY || null,
    },
  },
  budget: {
    maxPerProcurement: parseFloat(process.env.MAX_PER_PROCUREMENT || '500'),
    maxDailySpend: parseFloat(process.env.MAX_DAILY_SPEND || '2000'),
    maxMonthlySpend: parseFloat(process.env.MAX_MONTHLY_SPEND || '20000'),
    minProcurementAmount: parseFloat(process.env.MIN_PROCUREMENT_AMOUNT || '10'),
    usdcTokenId: process.env.USDC_TOKEN_ID || '0.0.429274',
    maxUSDCPerProcurement: parseFloat(process.env.MAX_USDC_PER_PROCUREMENT || '100'),
    minUSDCProcurementAmount: parseFloat(process.env.MIN_USDC_PER_PROCUREMENT || '1'),
  },
  serviceType: {
    allowedServices: ['filecoin-storage', 'akash-compute', 'akash-gpu'],
    blockedServices: [],
    requiresApproval: ['akash-gpu'],
    maxServiceCost: {
      'filecoin-storage': 300,
      'akash-compute': 500,
      'akash-gpu': 1000,
    },
  },
  reputation: {
    minReputationScore: parseFloat(process.env.MIN_REPUTATION_SCORE || '0.75'),
    maxFailureRate: parseFloat(process.env.MAX_FAILURE_RATE || '0.05'),
    minCompletedDeals: parseInt(process.env.MIN_COMPLETED_DEALS || '50', 10),
    maxProviderStrikes: parseInt(process.env.MAX_PROVIDER_STRIKES || '2', 10),
    requiredVerificationLevel: process.env.REQUIRED_VERIFICATION_LEVEL || 'verified',
  },
  allowlist: {
    enabled: process.env.ALLOWLIST_ENABLED !== 'false',
    allowedProviders: parseAllowedProviders(),
  },
  confirmation: {
    thresholdHBAR: parseFloat(process.env.CONFIRMATION_THRESHOLD || '100'),
    approverSignatureThresholdHBAR: parseFloat(
      process.env.APPROVER_SIGNATURE_THRESHOLD || '300',
    ),
  },
  delivery: {
    verificationTimeout: parseInt(process.env.VERIFICATION_TIMEOUT_MINUTES || '60', 10),
    requiredConfirmations: parseInt(process.env.REQUIRED_CONFIRMATIONS || '6', 10),
    autoRetry: process.env.AUTO_RETRY !== 'false',
    maxRetries: parseInt(process.env.MAX_DELIVERY_RETRIES || '3', 10),
  },
};
