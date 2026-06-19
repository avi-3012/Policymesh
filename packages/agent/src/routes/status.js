import { Router } from 'express';

export function createStatusRouter({
  budgetPolicy,
  hederaClient,
  procurementAgent,
  procurementStore,
  langChainService,
}) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'policymesh-agent',
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/status', (_req, res) => {
    const active = procurementStore
      ? [...procurementStore.procurements.values()].filter((p) =>
          ['confirmed', 'executing', 'awaiting_confirmation'].includes(p.status),
        ).length
      : 0;

    res.json({
      service: 'PolicyMesh',
      version: '0.1.0',
      demoMode: process.env.DEMO_MODE === 'true' || !process.env.HEDERA_ACCOUNT_ID,
      network: process.env.HEDERA_NETWORK || 'testnet',
      hederaConnected: hederaClient != null,
      activeProcurements: active,
      emergencyStop: procurementAgent?.emergencyStop ?? false,
      langChainAgent: langChainService?.getStatus() ?? null,
      recentErrors: [],
    });
  });

  router.get('/budget', (_req, res) => {
    const status = budgetPolicy.spendTracker
      ? budgetPolicy.spendTracker.getBudgetStatus({
          maxDailySpend: budgetPolicy.maxDailySpend,
          maxMonthlySpend: budgetPolicy.maxMonthlySpend,
        })
      : null;

    if (!status) {
      return res.json({
        dailySpend: 0,
        dailyLimit: budgetPolicy.maxDailySpend,
        monthlySpend: 0,
        monthlyLimit: budgetPolicy.maxMonthlySpend,
        remainingBudget: budgetPolicy.maxDailySpend,
      });
    }

    res.json({
      dailySpend: status.dailySpend,
      dailyLimit: status.dailyLimit,
      monthlySpend: status.monthlySpend,
      monthlyLimit: status.monthlyLimit,
      remainingBudget: status.remainingDaily,
    });
  });

  router.post('/emergency-stop', (req, res) => {
    if (!procurementAgent) {
      return res.status(503).json({ error: 'Procurement agent not available' });
    }
    const stopped = req.body.stopped !== false;
    procurementAgent.setEmergencyStop(stopped);
    res.json({ emergencyStop: stopped, message: stopped ? 'All procurements paused' : 'Procurements resumed' });
  });

  return router;
}
