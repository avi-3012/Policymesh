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
  budget: {
    maxPerProcurement: parseFloat(process.env.MAX_PER_PROCUREMENT || '500'),
    maxDailySpend: parseFloat(process.env.MAX_DAILY_SPEND || '2000'),
    maxMonthlySpend: parseFloat(process.env.MAX_MONTHLY_SPEND || '20000'),
    minProcurementAmount: parseFloat(process.env.MIN_PROCUREMENT_AMOUNT || '10'),
  },
};
