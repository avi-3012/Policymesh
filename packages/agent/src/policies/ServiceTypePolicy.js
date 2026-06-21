import { AbstractPolicy } from '@hashgraph/hedera-agent-kit';

const PROCUREMENT_TOOLS = [
  'procure_filecoin_storage',
  'procure_akash_compute',
  'swap_hbar_to_fil',
  'swap_hbar_to_akt',
  'swap_hbar_to_usdc',
];

const SERVICE_METADATA = {
  'filecoin-storage': {
    label: 'Filecoin Storage',
    riskLevel: 'low',
    typicalUseCases: ['Archival storage', 'Content addressing', 'Backup'],
    avgCostPerUnit: '0.5-2 HBAR/GB/month',
  },
  'akash-compute': {
    label: 'Akash Compute',
    riskLevel: 'medium',
    typicalUseCases: ['Web hosting', 'API services', 'Batch jobs'],
    avgCostPerUnit: '1-5 HBAR/CPU-hour',
  },
  'akash-gpu': {
    label: 'Akash GPU Compute',
    riskLevel: 'high',
    typicalUseCases: ['ML inference', 'Rendering', 'GPU workloads'],
    avgCostPerUnit: '5-20 HBAR/GPU-hour',
  },
};

/**
 * Restricts which services the agent may procure.
 * Lifecycle stage: preToolExecution
 */
export class ServiceTypePolicy extends AbstractPolicy {
  constructor(options = {}) {
    super();
    this.name = 'Service Type Policy';
    this.description = 'Restricts allowed service types and enforces per-service cost caps';
    this.relevantTools = PROCUREMENT_TOOLS;

    this.allowedServices = options.allowedServices ?? [
      'filecoin-storage',
      'akash-compute',
      'akash-gpu',
    ];
    this.blockedServices = options.blockedServices ?? [];
    this.requiresApproval = options.requiresApproval ?? ['akash-gpu'];
    this.maxServiceCost = options.maxServiceCost ?? {
      'filecoin-storage': 300,
      'akash-compute': 500,
      'akash-gpu': 1000,
    };

    this.lastBlockReason = null;
  }

  checkRequest({ serviceType, estimatedCostHBAR, humanApprovalToken }) {
    if (this.blockedServices.includes(serviceType)) {
      return {
        policy: 'ServiceTypePolicy',
        passed: false,
        reason: `Service type "${serviceType}" is explicitly blocked`,
      };
    }

    if (!this.allowedServices.includes(serviceType)) {
      return {
        policy: 'ServiceTypePolicy',
        passed: false,
        reason: `Service type "${serviceType}" is not in the allowed list: ${this.allowedServices.join(', ')}`,
      };
    }

    if (this.requiresApproval.includes(serviceType) && !humanApprovalToken) {
      return {
        policy: 'ServiceTypePolicy',
        passed: false,
        reason: `Service type "${serviceType}" requires human approval before procurement`,
        requiresApproval: true,
      };
    }

    const maxCost = this.maxServiceCost[serviceType];
    if (maxCost != null && estimatedCostHBAR > maxCost) {
      return {
        policy: 'ServiceTypePolicy',
        passed: false,
        reason: `Estimated cost ${estimatedCostHBAR} HBAR exceeds max allowed ${maxCost} HBAR for ${serviceType}`,
      };
    }

    return {
      policy: 'ServiceTypePolicy',
      passed: true,
      reason: null,
      metadata: SERVICE_METADATA[serviceType] ?? null,
    };
  }

  updateConfig(options) {
    if (options.allowedServices) this.allowedServices = options.allowedServices;
    if (options.blockedServices) this.blockedServices = options.blockedServices;
    if (options.requiresApproval) this.requiresApproval = options.requiresApproval;
    if (options.maxServiceCost) {
      this.maxServiceCost = { ...this.maxServiceCost, ...options.maxServiceCost };
    }
  }

  getConfig() {
    return {
      allowedServices: this.allowedServices,
      blockedServices: this.blockedServices,
      requiresApproval: this.requiresApproval,
      maxServiceCost: this.maxServiceCost,
      serviceMetadata: SERVICE_METADATA,
    };
  }

  shouldBlockPreToolExecution(_context, params, method) {
    if (!this.relevantTools.includes(method)) return false;

    const { serviceType, estimatedCostHBAR, maxCostHBAR, humanApprovalToken } =
      params.rawParams ?? {};

    const cost = estimatedCostHBAR ?? maxCostHBAR;
    const result = this.checkRequest({
      serviceType,
      estimatedCostHBAR: Number(cost),
      humanApprovalToken,
    });

    if (!result.passed) {
      this.lastBlockReason = result.reason;
      return true;
    }

    this.lastBlockReason = null;
    return false;
  }
}
