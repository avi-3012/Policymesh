import { hashscanTransactionUrl } from '../lib/hashscan.js';

export function requiresHumanConfirmation(costHBAR, config) {
  const threshold = config?.confirmation?.thresholdHBAR ?? 100;
  return Number(costHBAR) > threshold;
}

export function requiresApproverSignature(costHBAR, config) {
  const threshold = config?.confirmation?.approverSignatureThresholdHBAR ?? 300;
  return Number(costHBAR) > threshold;
}

/**
 * Execute a policy-approved procurement (swap → purchase → verify → audit).
 */
export async function executeProcurementRecord({
  procurementId,
  record,
  procurementStore,
  procurementAgent,
  auditHook,
  config,
  approverSignature = null,
  approvedBy = 'human',
}) {
  if (!procurementAgent) {
    throw new Error('Procurement agent not available');
  }

  const cost = record.estimatedCostHBAR ?? record.maxCostHBAR;
  if (requiresApproverSignature(cost, config) && !approverSignature) {
    const threshold = config?.confirmation?.approverSignatureThresholdHBAR ?? 300;
    const err = new Error(`Procurements over ${threshold} HBAR require approverSignature`);
    err.code = 'APPROVER_SIGNATURE_REQUIRED';
    err.threshold = threshold;
    throw err;
  }

  procurementStore.update(procurementId, {
    status: 'executing',
    approverSignature: approverSignature ?? null,
    approvedBy,
    approvedAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  });

  await auditHook.logProcurementEvent('procurement.confirmed', {
    procurementId,
    approverSignature: approverSignature ?? null,
    approvedBy,
  });

  const confirmed = procurementStore.get(procurementId);
  const result = await procurementAgent.executeProcurement(confirmed);

  const updated = procurementStore.update(procurementId, {
    status: result.status,
    execution: result,
    swap: result.swap ?? null,
    delivery: result.delivery ?? null,
    deliveryRef: result.deliveryRef ?? null,
    completedAt: result.success ? new Date().toISOString() : null,
    error: result.error ?? null,
  });

  return {
    status: updated.status,
    procurement: updated,
    transactionDetails: {
      swap: result.swap,
      delivery: result.delivery,
      hbarSpent: result.hbarSpent,
    },
    hashscan: {
      swap: result.swap?.transactionHash
        ? hashscanTransactionUrl(result.swap.transactionHash, config?.hedera?.network)
        : null,
    },
  };
}

export function buildProcurementResponse(record, extras = {}) {
  return {
    procurementId: record.id,
    status: record.status,
    estimatedCost: record.estimatedCostHBAR,
    policyChecks: record.policyChecks,
    recommendedProvider: record.recommendedProvider ?? null,
    ...extras,
  };
}
