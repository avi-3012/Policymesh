import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function createProcureRouter({
  policyEngine,
  procurementStore,
  auditHook,
  reputationService,
  procurementAgent,
}) {
  const router = Router();

  async function evaluateAndCreate(serviceType, body) {
    const procurementId = uuidv4();
    const estimatedCostHBAR = body.maxCostHBAR;

    const policyChecks = policyEngine.evaluateProcurement({
      serviceType,
      amountHBAR: estimatedCostHBAR,
      providerId: body.providerId,
      humanApprovalToken: body.humanApprovalToken,
    });

    const allPassed = policyChecks.every((c) => c.passed);

    for (const check of policyChecks) {
      await auditHook.logPolicyDecision({
        procurementId,
        policyName: check.policy,
        passed: check.passed,
        reason: check.reason,
        details: check,
      });
    }

    const record = procurementStore.create({
      id: procurementId,
      serviceType,
      status: allPassed ? 'awaiting_confirmation' : 'policy_rejected',
      estimatedCostHBAR,
      policyChecks,
      ...body,
    });

    if (!body.providerId && allPassed) {
      const providers = reputationService.listProviders({
        serviceType,
        minReputation: policyEngine.reputationPolicy.minReputationScore,
        availableOnly: true,
      });
      if (providers.length > 0) {
        record.recommendedProvider = providers[0];
        procurementStore.update(procurementId, { recommendedProvider: providers[0] });
      }
    }

    return record;
  }

  router.post('/storage', async (req, res) => {
    try {
      const { sizeGB, durationDays, maxCostHBAR, redundancy, userAccount, providerId, humanApprovalToken } =
        req.body;

      if (!sizeGB || !durationDays || !maxCostHBAR) {
        return res.status(400).json({ error: 'sizeGB, durationDays, and maxCostHBAR are required' });
      }

      const record = await evaluateAndCreate('filecoin-storage', {
        sizeGB,
        durationDays,
        maxCostHBAR,
        redundancy: redundancy ?? 'standard',
        userAccount,
        providerId,
        humanApprovalToken,
      });

      res.status(record.status === 'policy_rejected' ? 422 : 201).json({
        procurementId: record.id,
        status: record.status,
        estimatedCost: record.estimatedCostHBAR,
        policyChecks: record.policyChecks,
        recommendedProvider: record.recommendedProvider ?? null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/compute', async (req, res) => {
    try {
      const {
        cpuCount,
        memoryGB,
        gpuEnabled,
        durationHours,
        maxCostHBAR,
        userAccount,
        providerId,
        humanApprovalToken,
      } = req.body;

      if (!cpuCount || !memoryGB || !durationHours || !maxCostHBAR) {
        return res.status(400).json({
          error: 'cpuCount, memoryGB, durationHours, and maxCostHBAR are required',
        });
      }

      const serviceType = gpuEnabled ? 'akash-gpu' : 'akash-compute';

      const record = await evaluateAndCreate(serviceType, {
        cpuCount,
        memoryGB,
        gpuEnabled: Boolean(gpuEnabled),
        durationHours,
        maxCostHBAR,
        userAccount,
        providerId,
        humanApprovalToken,
      });

      res.status(record.status === 'policy_rejected' ? 422 : 201).json({
        procurementId: record.id,
        status: record.status,
        estimatedCost: record.estimatedCostHBAR,
        policyChecks: record.policyChecks,
        recommendedProvider: record.recommendedProvider ?? null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/', (req, res) => {
    const result = procurementStore.list({
      status: req.query.status,
      serviceType: req.query.serviceType,
      user: req.query.user,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
    });
    res.json(result);
  });

  router.get('/:id', (req, res) => {
    const record = procurementStore.get(req.params.id);
    if (!record) return res.status(404).json({ error: 'Procurement not found' });
    res.json(record);
  });

  router.post('/:id/confirm', async (req, res) => {
    const record = procurementStore.get(req.params.id);
    if (!record) return res.status(404).json({ error: 'Procurement not found' });

    if (record.status !== 'awaiting_confirmation') {
      return res.status(400).json({ error: `Cannot confirm procurement in status: ${record.status}` });
    }

    const highValueThreshold = 300;
    const cost = record.estimatedCostHBAR ?? record.maxCostHBAR;
    if (cost > highValueThreshold && !req.body.approverSignature) {
      return res.status(400).json({
        error: `Procurements over ${highValueThreshold} HBAR require approverSignature`,
        requiresConfirmation: true,
      });
    }

    procurementStore.update(req.params.id, {
      status: 'executing',
      approverSignature: req.body.approverSignature ?? null,
      confirmedAt: new Date().toISOString(),
    });

    await auditHook.logProcurementEvent('procurement.confirmed', {
      procurementId: record.id,
      approverSignature: req.body.approverSignature ?? null,
    });

    if (!procurementAgent) {
      return res.status(503).json({ error: 'Procurement agent not available' });
    }

    const confirmed = procurementStore.get(req.params.id);
    const result = await procurementAgent.executeProcurement(confirmed);

    const updated = procurementStore.update(req.params.id, {
      status: result.status,
      execution: result,
      swap: result.swap ?? null,
      delivery: result.delivery ?? null,
      deliveryRef: result.deliveryRef ?? null,
      completedAt: result.success ? new Date().toISOString() : null,
      error: result.error ?? null,
    });

    res.json({
      status: updated.status,
      procurement: updated,
      transactionDetails: {
        swap: result.swap,
        delivery: result.delivery,
        hbarSpent: result.hbarSpent,
      },
    });
  });

  return router;
}
