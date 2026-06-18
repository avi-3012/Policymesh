import { AbstractPolicy } from '@hashgraph/hedera-agent-kit';

const PROCUREMENT_TOOLS = [
  'procure_filecoin_storage',
  'procure_akash_compute',
];

/**
 * Ensures services are delivered and match specifications before finalizing.
 * Lifecycle stage: postCoreAction
 */
export class DeliveryVerificationPolicy extends AbstractPolicy {
  constructor(options = {}, { filecoinService, akashService } = {}) {
    super();
    this.name = 'Delivery Verification Policy';
    this.description =
      'Verifies on-chain delivery of storage deals and compute deployments before payment finalization';
    this.relevantTools = PROCUREMENT_TOOLS;

    this.verificationTimeout = options.verificationTimeout ?? 60;
    this.requiredConfirmations = options.requiredConfirmations ?? 6;
    this.autoRetry = options.autoRetry ?? true;
    this.maxRetries = options.maxRetries ?? 3;

    this.filecoinService = filecoinService;
    this.akashService = akashService;
    this.lastBlockReason = null;
  }

  async verifyDelivery(serviceType, deliveryRef, specs) {
    if (serviceType === 'filecoin-storage') {
      return this.verifyFilecoinDeal(deliveryRef, specs);
    }
    if (serviceType === 'akash-compute' || serviceType === 'akash-gpu') {
      return this.verifyAkashDeployment(deliveryRef, specs);
    }
    return { verified: false, reason: `Unknown service type: ${serviceType}` };
  }

  async verifyFilecoinDeal(dealId, specs) {
    const result = await this.filecoinService.verifyDeal(dealId, specs?.pieceCid);
    if (!result.verified) {
      return {
        policy: 'DeliveryVerificationPolicy',
        passed: false,
        reason: result.reason,
        deliveryRef: dealId,
      };
    }

    if (specs?.sizeGB && result.deal.sizeGB !== specs.sizeGB) {
      return {
        policy: 'DeliveryVerificationPolicy',
        passed: false,
        reason: `Delivered size ${result.deal.sizeGB}GB does not match requested ${specs.sizeGB}GB`,
        deliveryRef: dealId,
      };
    }

    return {
      policy: 'DeliveryVerificationPolicy',
      passed: true,
      reason: null,
      deliveryRef: dealId,
      deal: result.deal,
    };
  }

  async verifyAkashDeployment(deploymentId, specs) {
    const result = await this.akashService.verifyDeployment(deploymentId, specs);
    if (!result.verified) {
      return {
        policy: 'DeliveryVerificationPolicy',
        passed: false,
        reason: result.reason,
        deliveryRef: deploymentId,
      };
    }

    return {
      policy: 'DeliveryVerificationPolicy',
      passed: true,
      reason: null,
      deliveryRef: deploymentId,
      deployment: result.deployment,
    };
  }

  updateConfig(options) {
    if (options.verificationTimeout != null) {
      this.verificationTimeout = options.verificationTimeout;
    }
    if (options.requiredConfirmations != null) {
      this.requiredConfirmations = options.requiredConfirmations;
    }
    if (options.autoRetry != null) this.autoRetry = options.autoRetry;
    if (options.maxRetries != null) this.maxRetries = options.maxRetries;
  }

  getConfig() {
    return {
      verificationTimeout: this.verificationTimeout,
      requiredConfirmations: this.requiredConfirmations,
      autoRetry: this.autoRetry,
      maxRetries: this.maxRetries,
    };
  }

  shouldBlockPostCoreAction(_context, params, method) {
    if (!this.relevantTools.includes(method)) return false;

    const result = params.coreActionResult?.verificationResult;
    if (!result) {
      this.lastBlockReason = 'No delivery verification result available';
      return true;
    }

    if (!result.passed) {
      this.lastBlockReason = result.reason ?? 'Delivery verification failed';
      return true;
    }

    this.lastBlockReason = null;
    return false;
  }
}
