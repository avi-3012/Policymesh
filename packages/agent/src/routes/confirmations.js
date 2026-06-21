import { Router } from 'express';
import {
  executeProcurementRecord,
  requiresApproverSignature,
} from '../services/ProcurementExecutor.js';

export function createConfirmationsRouter({
  procurementStore,
  procurementAgent,
  auditHook,
  config,
}) {
  const router = Router();

  router.get('/:id', (req, res) => {
    const record = procurementStore.get(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Procurement not found' });
    }

    res.json({
      procurementId: record.id,
      status: record.status,
      requiresHumanConfirmation: record.requiresHumanConfirmation ?? false,
      estimatedCostHBAR: record.estimatedCostHBAR ?? record.maxCostHBAR,
      threshold: config?.confirmation?.thresholdHBAR ?? 100,
      procurement: record,
    });
  });

  router.post('/:id/approve', async (req, res) => {
    try {
      const record = procurementStore.get(req.params.id);
      if (!record) {
        return res.status(404).json({ error: 'Procurement not found' });
      }

      if (record.status !== 'awaiting_confirmation') {
        return res.status(400).json({
          error: `Cannot approve procurement in status: ${record.status}`,
        });
      }

      const cost = record.estimatedCostHBAR ?? record.maxCostHBAR;
      if (
        requiresApproverSignature(cost, config) &&
        !req.body.approverSignature
      ) {
        const threshold = config?.confirmation?.approverSignatureThresholdHBAR ?? 300;
        return res.status(400).json({
          error: `Procurements over ${threshold} HBAR require approverSignature`,
          requiresApproverSignature: true,
        });
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

      res.json({
        status: 'executed',
        procurementStatus: result.status,
        procurement: result.procurement,
        transactionDetails: result.transactionDetails,
        hashscan: result.hashscan,
      });
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

  router.post('/:id/reject', async (req, res) => {
    try {
      const record = procurementStore.get(req.params.id);
      if (!record) {
        return res.status(404).json({ error: 'Procurement not found' });
      }

      if (record.status !== 'awaiting_confirmation') {
        return res.status(400).json({
          error: `Cannot reject procurement in status: ${record.status}`,
        });
      }

      const updated = procurementStore.update(req.params.id, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: req.body.rejectedBy ?? 'human',
        rejectionReason: req.body.reason ?? null,
      });

      await auditHook.logProcurementEvent('procurement.rejected', {
        procurementId: record.id,
        rejectedBy: updated.rejectedBy,
        reason: updated.rejectionReason,
      });

      res.json({
        status: 'rejected',
        procurement: updated,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
