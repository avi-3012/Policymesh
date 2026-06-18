import { BudgetPolicy } from '../policies/BudgetPolicy.js';
import { ServiceTypePolicy } from '../policies/ServiceTypePolicy.js';
import { ServiceProviderReputationPolicy } from '../policies/ServiceProviderReputationPolicy.js';

/**
 * Central policy engine coordinating all procurement policies.
 */
export class PolicyEngine {
  constructor({ budgetPolicy, serviceTypePolicy, reputationPolicy }) {
    this.budgetPolicy = budgetPolicy;
    this.serviceTypePolicy = serviceTypePolicy;
    this.reputationPolicy = reputationPolicy;
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

    return { valid: true };
  }

  getHooks() {
    return [this.budgetPolicy, this.serviceTypePolicy, this.reputationPolicy];
  }
}

export function createPolicyEngine({ spendTracker, reputationService, config }) {
  const budgetPolicy = new BudgetPolicy(config.budget, spendTracker);
  const serviceTypePolicy = new ServiceTypePolicy(config.serviceType ?? {});
  const reputationPolicy = new ServiceProviderReputationPolicy(
    config.reputation ?? {},
    reputationService,
  );

  return new PolicyEngine({ budgetPolicy, serviceTypePolicy, reputationPolicy });
}
