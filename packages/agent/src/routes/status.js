import { Router } from 'express';
import { spendTracker } from '../services/SpendTracker.js';
import { config } from '../config/index.js';

export function createStatusRouter({ budgetPolicy, hederaClient }) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'policymesh-agent',
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/status', (_req, res) => {
    res.json({
      service: 'PolicyMesh',
      version: '0.1.0',
      demoMode: config.demoMode,
      network: config.hedera.network,
      hederaConnected: hederaClient != null,
      activeProcurements: 0,
      recentErrors: [],
    });
  });

  router.get('/budget', (_req, res) => {
    const status = spendTracker.getBudgetStatus({
      maxDailySpend: budgetPolicy.maxDailySpend,
      maxMonthlySpend: budgetPolicy.maxMonthlySpend,
    });
    res.json(status);
  });

  return router;
}
