import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  demoMode: process.env.DEMO_MODE === 'true' || !process.env.HEDERA_ACCOUNT_ID,
  hedera: {
    network: process.env.HEDERA_NETWORK || 'testnet',
    accountId: process.env.HEDERA_ACCOUNT_ID,
    privateKey: process.env.HEDERA_PRIVATE_KEY,
    hcsAuditTopicId: process.env.HCS_AUDIT_TOPIC_ID,
    hcsReputationTopicId: process.env.HCS_REPUTATION_TOPIC_ID,
  },
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  budget: {
    maxPerProcurement: parseFloat(process.env.MAX_PER_PROCUREMENT || '500'),
    maxDailySpend: parseFloat(process.env.MAX_DAILY_SPEND || '2000'),
    maxMonthlySpend: parseFloat(process.env.MAX_MONTHLY_SPEND || '20000'),
    minProcurementAmount: parseFloat(process.env.MIN_PROCUREMENT_AMOUNT || '10'),
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
  delivery: {
    verificationTimeout: parseInt(process.env.VERIFICATION_TIMEOUT_MINUTES || '60', 10),
    requiredConfirmations: parseInt(process.env.REQUIRED_CONFIRMATIONS || '6', 10),
    autoRetry: process.env.AUTO_RETRY !== 'false',
    maxRetries: parseInt(process.env.MAX_DELIVERY_RETRIES || '3', 10),
  },
};
