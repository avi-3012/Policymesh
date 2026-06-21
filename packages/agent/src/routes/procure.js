import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  buildProcurementResponse,
  executeProcurementRecord,
  requiresHumanConfirmation,
} from '../services/ProcurementExecutor.js';

export function createProcureRouter({
  policyEngine,
  procurementStore,
  auditHook,
  reputationService,
  procurementAgent,
  config,
}) {
  const router = Router();
  const confirmationThreshold = config?.confirmation?.thresholdHBAR ?? 100;

  async function evaluateAndCreate(serviceType, body) {
    const procurementId = uuidv4();
    const paymentToken = body.paymentToken ?? 'HBAR';
    const isUsdc = paymentToken === 'USDC' || paymentToken === config?.budget?.usdcTokenId;
    const estimatedCostHBAR = isUsdc ? null : body.maxCostHBAR;
    const estimatedCostUSDC = isUsdc ? body.maxCostUSDC ?? body.maxCostHBAR : null;
    const confirmAmount = isUsdc ? estimatedCostUSDC : estimatedCostHBAR;
    const needsConfirmation = requiresHumanConfirmation(confirmAmount, config);

    const policyChecks = policyEngine.evaluateProcurement({
      serviceType,
      amountHBAR: estimatedCostHBAR,
      amountUSDC: estimatedCostUSDC,
      paymentToken: isUsdc ? 'USDC' : 'HBAR',
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
      status: allPassed
        ? needsConfirmation
          ? 'awaiting_confirmation'
          : 'awaiting_execution'
        : 'policy_rejected',
      paymentToken: isUsdc ? 'USDC' : 'HBAR',
      estimatedCostHBAR,
      estimatedCostUSDC,
      policyChecks,
      requiresHumanConfirmation: needsConfirmation,
      confirmationThreshold,
      ...body,
    });

    if (!body.providerId && allPassed) {
      const providers = policyEngine.allowlistPolicy.filterProviders(
        reputationService.listProviders({
          serviceType,
          minReputation: policyEngine.reputationPolicy.minReputationScore,
          availableOnly: true,
        }),
      );
      if (providers.length > 0) {
        record.recommendedProvider = providers[0];
        procurementStore.update(procurementId, { recommendedProvider: providers[0] });
      }
    }

    return { record, allPassed, needsConfirmation };
  }

  async function respondAfterCreate(res, { record, allPassed, needsConfirmation }) {
    if (record.status === 'policy_rejected') {
      return res.status(422).json(buildProcurementResponse(record));
    }

    if (!needsConfirmation && allPassed) {
      try {
        const result = await executeProcurementRecord({
          procurementId: record.id,
          record: procurementStore.get(record.id),
          procurementStore,
          procurementAgent,
          auditHook,
          config,
          approvedBy: 'auto',
        });

        return res.status(200).json({
          ...buildProcurementResponse(procurementStore.get(record.id)),
          autoExecuted: true,
          message: `Purchase under ${confirmationThreshold} HBAR — executed automatically`,
          transactionDetails: result.transactionDetails,
          hashscan: result.hashscan,
        });
      } catch (err) {
        procurementStore.update(record.id, {
          status: 'failed',
          error: err.message,
        });
        return res.status(500).json({
          ...buildProcurementResponse(procurementStore.get(record.id)),
          error: err.message,
        });
      }
    }

    return res.status(201).json({
      ...buildProcurementResponse(record),
      requiresHumanConfirmation: true,
      threshold: confirmationThreshold,
      message: `Purchase over ${confirmationThreshold} HBAR requires human approval. POST /api/confirmations/${record.id}/approve to confirm.`,
      approveUrl: `/api/confirmations/${record.id}/approve`,
      rejectUrl: `/api/confirmations/${record.id}/reject`,
    });
  }

  router.post('/storage', async (req, res) => {
    try {
      const { sizeGB, durationDays, maxCostHBAR, maxCostUSDC, paymentToken, redundancy, userAccount, providerId, humanApprovalToken } =
        req.body;

      if (!sizeGB || !durationDays || (!maxCostHBAR && !maxCostUSDC)) {
        return res.status(400).json({
          error: 'sizeGB, durationDays, and maxCostHBAR or maxCostUSDC are required',
        });
      }

      const evaluated = await evaluateAndCreate('filecoin-storage', {
        sizeGB,
        durationDays,
        maxCostHBAR,
        maxCostUSDC,
        paymentToken,
        redundancy: redundancy ?? 'standard',
        userAccount,
        providerId,
        humanApprovalToken,
      });

      return respondAfterCreate(res, evaluated);
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
        maxCostUSDC,
        paymentToken,
        userAccount,
        providerId,
        humanApprovalToken,
      } = req.body;

      if (!cpuCount || !memoryGB || !durationHours || (!maxCostHBAR && !maxCostUSDC)) {
        return res.status(400).json({
          error: 'cpuCount, memoryGB, durationHours, and maxCostHBAR or maxCostUSDC are required',
        });
      }

      const serviceType = gpuEnabled ? 'akash-gpu' : 'akash-compute';

      const evaluated = await evaluateAndCreate(serviceType, {
        cpuCount,
        memoryGB,
        gpuEnabled: Boolean(gpuEnabled),
        durationHours,
        maxCostHBAR,
        maxCostUSDC,
        paymentToken,
        userAccount,
        providerId,
        humanApprovalToken,
      });

      return respondAfterCreate(res, evaluated);
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
    try {
      const record = procurementStore.get(req.params.id);
      if (!record) return res.status(404).json({ error: 'Procurement not found' });

      if (record.status !== 'awaiting_confirmation') {
        return res.status(400).json({ error: `Cannot confirm procurement in status: ${record.status}` });
      }

      const result = await executeProcurementRecord({
        procurementId: req.params.id,
        record,
        procurementStore,
        procurementAgent,
        auditHook,
        config,
        approverSignature: req.body.approverSignature ?? null,
        approvedBy: req.body.approvedBy ?? 'human',
      });

      res.json(result);
    } catch (err) {
      if (err.code === 'APPROVER_SIGNATURE_REQUIRED') {
        return res.status(400).json({
          error: err.message,
          requiresApproverSignature: true,
          threshold: err.threshold,
        });
      }
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
