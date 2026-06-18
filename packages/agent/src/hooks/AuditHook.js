import { AbstractHook } from '@hashgraph/hedera-agent-kit';

const DEFAULT_TOOLS = [
  'procure_filecoin_storage',
  'procure_akash_compute',
  'swap_hbar_to_fil',
  'swap_hbar_to_akt',
];

/**
 * Maintains comprehensive audit trail of procurement activities.
 * Stages: preToolExecution and postToolExecution
 */
export class AuditHook extends AbstractHook {
  constructor(hcsService, relevantTools = DEFAULT_TOOLS) {
    super();
    this.name = 'Audit Hook';
    this.description = 'Logs procurement intent and results to HCS audit trail';
    this.relevantTools = relevantTools;
    this.hcsService = hcsService;
  }

  async preToolExecutionHook(_context, params, method) {
    if (!this.relevantTools.includes(method)) return;

    await this.hcsService.submitMessage({
      eventType: 'procurement.intent',
      stage: 'pre_tool_execution',
      tool: method,
      rawParams: params.rawParams,
      policyChecksPending: true,
    });
  }

  async postToolExecutionHook(_context, params, method) {
    if (!this.relevantTools.includes(method)) return;

    await this.hcsService.submitMessage({
      eventType: 'procurement.result',
      stage: 'post_tool_execution',
      tool: method,
      success: !params.toolResult?.error,
      result: params.toolResult,
      normalisedParams: params.normalisedParams,
    });
  }

  async logPolicyDecision({ procurementId, policyName, passed, reason, details }) {
    return this.hcsService.submitMessage({
      eventType: passed ? 'policy.approved' : 'policy.violation',
      procurementId,
      policyName,
      passed,
      reason,
      details,
    });
  }

  async logProcurementEvent(eventType, payload) {
    return this.hcsService.submitMessage({
      eventType,
      ...payload,
    });
  }
}
