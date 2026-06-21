import { BudgetPolicy } from './BudgetPolicy.js';
import { ServiceTypePolicy } from './ServiceTypePolicy.js';
import { ServiceProviderReputationPolicy } from './ServiceProviderReputationPolicy.js';
import { AllowlistPolicy } from './AllowlistPolicy.js';
import { DeliveryVerificationPolicy } from './DeliveryVerificationPolicy.js';

/**
 * Central policy engine coordinating all procurement policies.
 */
export class PolicyEngine {
  constructor({
    budgetPolicy,
    serviceTypePolicy,
    reputationPolicy,
    allowlistPolicy,
    deliveryVerificationPolicy,
  }) {
    this.budgetPolicy = budgetPolicy;
    this.serviceTypePolicy = serviceTypePolicy;
    this.reputationPolicy = reputationPolicy;
    this.allowlistPolicy = allowlistPolicy;
    this.deliveryVerificationPolicy = deliveryVerificationPolicy;
  }

  evaluateProcurement({
    serviceType,
    amountHBAR,
    amountUSDC,
    paymentToken = 'HBAR',
    providerId,
    humanApprovalToken,
  }) {
    const checks = [];
    const token = paymentToken === '0.0.429274' || paymentToken === 'USDC' ? 'USDC' : 'HBAR';
    const amount = token === 'USDC' ? amountUSDC : amountHBAR;

    checks.push(this.budgetPolicy.checkProcurement(amount, token));
    checks.push(
      this.serviceTypePolicy.checkRequest({
        serviceType,
        estimatedCostHBAR: amountHBAR,
        humanApprovalToken,
      }),
    );

    if (providerId) {
      checks.push(this.allowlistPolicy.evaluateProvider(providerId));
      checks.push(this.reputationPolicy.evaluateProvider(providerId));
    }

    return checks;
  }

  getAllPolicies() {
    return {
      BudgetPolicy: this.budgetPolicy.getConfig(),
      ServiceTypePolicy: this.serviceTypePolicy.getConfig(),
      ServiceProviderReputationPolicy: this.reputationPolicy.getConfig(),
      AllowlistPolicy: this.allowlistPolicy.getConfig(),
      DeliveryVerificationPolicy: this.deliveryVerificationPolicy.getConfig(),
    };
  }

  updatePolicies(updates) {
    if (!updates || typeof updates !== 'object') {
      return { valid: false, error: 'Invalid policy updates' };
    }

    if (updates.BudgetPolicy) {
      this.budgetPolicy.updateConfig(updates.BudgetPolicy);
    }
    if (updates.ServiceTypePolicy) {
      this.serviceTypePolicy.updateConfig(updates.ServiceTypePolicy);
    }
    if (updates.ServiceProviderReputationPolicy) {
      this.reputationPolicy.updateConfig(updates.ServiceProviderReputationPolicy);
    }
    if (updates.AllowlistPolicy) {
      this.allowlistPolicy.updateConfig(updates.AllowlistPolicy);
    }
    if (updates.DeliveryVerificationPolicy) {
      this.deliveryVerificationPolicy.updateConfig(updates.DeliveryVerificationPolicy);
    }

    return { valid: true };
  }

  getHooks() {
    return [
      this.budgetPolicy,
      this.serviceTypePolicy,
      this.reputationPolicy,
      this.allowlistPolicy,
      this.deliveryVerificationPolicy,
    ];
  }
}

export function createPolicyEngine({
  spendTracker,
  reputationService,
  filecoinService,
  akashService,
  config,
}) {
  const budgetPolicy = new BudgetPolicy(config.budget, spendTracker);
  const serviceTypePolicy = new ServiceTypePolicy(config.serviceType ?? {});
  const reputationPolicy = new ServiceProviderReputationPolicy(
    config.reputation ?? {},
    reputationService,
  );
  const allowlistPolicy = new AllowlistPolicy(config.allowlist ?? {});
  const deliveryVerificationPolicy = new DeliveryVerificationPolicy(
    config.delivery ?? {},
    { filecoinService, akashService },
  );

  return new PolicyEngine({
    budgetPolicy,
    serviceTypePolicy,
    reputationPolicy,
    allowlistPolicy,
    deliveryVerificationPolicy,
  });
}
