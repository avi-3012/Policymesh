import { AbstractHook } from '@hashgraph/hedera-agent-kit';

const DEFAULT_TOOLS = [
  'procure_filecoin_storage',
  'procure_akash_compute',
  'swap_hbar_to_fil',
  'swap_hbar_to_akt',
];

/**
 * Alerts users and administrators of procurement events.
 */
export class NotificationHook extends AbstractHook {
  constructor(notificationStore, relevantTools = DEFAULT_TOOLS) {
    super();
    this.name = 'Notification Hook';
    this.description = 'Sends notifications for procurements, violations, and failures';
    this.relevantTools = relevantTools;
    this.notificationStore = notificationStore;
  }

  async postToolExecutionHook(_context, params, method) {
    if (!this.relevantTools.includes(method)) return;

    const success = !params.toolResult?.error;
    this.notificationStore.emit(success ? 'procurement.update' : 'procurement.error', {
      tool: method,
      success,
      result: params.toolResult,
      procurementId: params.rawParams?.procurementId,
    });
  }

  notifyPolicyViolation(procurementId, policyName, reason, suggestedAction) {
    return this.notificationStore.emit('policy.violation', {
      procurementId,
      policyName,
      reason,
      suggestedAction,
    });
  }

  notifyBudgetThreshold(thresholdType, currentValue, limitValue) {
    const percentage = (currentValue / limitValue) * 100;
    return this.notificationStore.emit('budget.threshold', {
      thresholdType,
      currentValue,
      limitValue,
      percentage,
    });
  }

  notifyDeliveryFailure(procurementId, reason) {
    return this.notificationStore.emit('delivery.failure', {
      procurementId,
      reason,
    });
  }
}
