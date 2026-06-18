import { BudgetPolicy } from './BudgetPolicy.js';
import { ServiceTypePolicy } from './ServiceTypePolicy.js';
import { ServiceProviderReputationPolicy } from './ServiceProviderReputationPolicy.js';
import { DeliveryVerificationPolicy } from './DeliveryVerificationPolicy.js';

/**
 * Central policy engine coordinating all procurement policies.
 */
export class PolicyEngine {
  constructor({
    budgetPolicy,
    serviceTypePolicy,
    reputationPolicy,
    deliveryVerificationPolicy,
  }) {
    this.budgetPolicy = budgetPolicy;
    this.serviceTypePolicy = serviceTypePolicy;
    this.reputationPolicy = reputationPolicy;
    this.deliveryVerificationPolicy = deliveryVerificationPolicy;
  }

  evaluateProcurement({ serviceType, amountHBAR, providerId, humanApprovalToken }) {
    const checks = [];

    checks.push(this.budgetPolicy.checkProcurement(amountHBAR));
    checks.push(
      this.serviceTypePolicy.checkRequest({
        serviceType,
        estimatedCostHBAR: amountHBAR,
        humanApprovalToken,
      }),
    );

    if (providerId) {
      checks.push(this.reputationPolicy.evaluateProvider(providerId));
    }

    return checks;
  }

  getAllPolicies() {
    return {
      BudgetPolicy: this.budgetPolicy.getConfig(),
      ServiceTypePolicy: this.serviceTypePolicy.getConfig(),
      ServiceProviderReputationPolicy: this.reputationPolicy.getConfig(),
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
  const deliveryVerificationPolicy = new DeliveryVerificationPolicy(
    config.delivery ?? {},
    { filecoinService, akashService },
  );

  return new PolicyEngine({
    budgetPolicy,
    serviceTypePolicy,
    reputationPolicy,
    deliveryVerificationPolicy,
  });
}
