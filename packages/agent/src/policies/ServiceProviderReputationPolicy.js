import { AbstractPolicy } from '@hashgraph/hedera-agent-kit';

const PROCUREMENT_TOOLS = [
  'procure_filecoin_storage',
  'procure_akash_compute',
];

/**
 * Ensures service providers meet quality and reliability standards.
 * Lifecycle stage: preToolExecution
 */
export class ServiceProviderReputationPolicy extends AbstractPolicy {
  constructor(options = {}, reputationService) {
    super();
    this.name = 'Service Provider Reputation Policy';
    this.description =
      'Blocks procurement from providers below reputation and reliability thresholds';
    this.relevantTools = PROCUREMENT_TOOLS;

    this.minReputationScore = options.minReputationScore ?? 0.75;
    this.maxFailureRate = options.maxFailureRate ?? 0.05;
    this.minCompletedDeals = options.minCompletedDeals ?? 50;
    this.maxProviderStrikes = options.maxProviderStrikes ?? 2;
    this.requiredVerificationLevel = options.requiredVerificationLevel ?? 'verified';

    this.reputationService = reputationService;
    this.lastBlockReason = null;
  }

  evaluateProvider(providerId) {
    if (this.reputationService.isBlacklisted(providerId)) {
      return {
        policy: 'ServiceProviderReputationPolicy',
        passed: false,
        reason: `Provider ${providerId} is on the global blacklist`,
      };
    }

    const provider = this.reputationService.getProvider(providerId);
    if (!provider) {
      return {
        policy: 'ServiceProviderReputationPolicy',
        passed: false,
        reason: `Provider ${providerId} not found in reputation registry`,
      };
    }

    const totalDeals = provider.completedDeals + provider.failedDeals;
    const failureRate = totalDeals > 0 ? provider.failedDeals / totalDeals : 1;

    if (provider.reputationScore < this.minReputationScore) {
      return {
        policy: 'ServiceProviderReputationPolicy',
        passed: false,
        reason: `Provider ${providerId} reputation score ${provider.reputationScore.toFixed(2)} is below minimum ${this.minReputationScore}`,
        provider,
        suggestedAlternatives: this.reputationService
          .listProviders({ serviceType: provider.serviceType, minReputation: this.minReputationScore })
          .slice(0, 3)
          .map((p) => p.id),
      };
    }

    if (failureRate > this.maxFailureRate) {
      return {
        policy: 'ServiceProviderReputationPolicy',
        passed: false,
        reason: `Provider ${providerId} failure rate ${(failureRate * 100).toFixed(1)}% exceeds maximum ${(this.maxFailureRate * 100).toFixed(1)}%`,
        provider,
      };
    }

    if (provider.completedDeals < this.minCompletedDeals) {
      return {
        policy: 'ServiceProviderReputationPolicy',
        passed: false,
        reason: `Provider ${providerId} has only ${provider.completedDeals} completed deals (minimum ${this.minCompletedDeals})`,
        provider,
      };
    }

    if (provider.slashingEvents > this.maxProviderStrikes) {
      return {
        policy: 'ServiceProviderReputationPolicy',
        passed: false,
        reason: `Provider ${providerId} has ${provider.slashingEvents} slashing events (maximum ${this.maxProviderStrikes})`,
        provider,
      };
    }

    if (
      this.requiredVerificationLevel === 'verified' &&
      provider.verificationLevel !== 'verified'
    ) {
      return {
        policy: 'ServiceProviderReputationPolicy',
        passed: false,
        reason: `Provider ${providerId} verification level "${provider.verificationLevel}" does not meet required "${this.requiredVerificationLevel}"`,
        provider,
      };
    }

    return {
      policy: 'ServiceProviderReputationPolicy',
      passed: true,
      reason: null,
      provider,
    };
  }

  updateConfig(options) {
    if (options.minReputationScore != null) {
      this.minReputationScore = options.minReputationScore;
    }
    if (options.maxFailureRate != null) this.maxFailureRate = options.maxFailureRate;
    if (options.minCompletedDeals != null) {
      this.minCompletedDeals = options.minCompletedDeals;
    }
    if (options.maxProviderStrikes != null) {
      this.maxProviderStrikes = options.maxProviderStrikes;
    }
    if (options.requiredVerificationLevel != null) {
      this.requiredVerificationLevel = options.requiredVerificationLevel;
    }
  }

  getConfig() {
    return {
      minReputationScore: this.minReputationScore,
      maxFailureRate: this.maxFailureRate,
      minCompletedDeals: this.minCompletedDeals,
      maxProviderStrikes: this.maxProviderStrikes,
      requiredVerificationLevel: this.requiredVerificationLevel,
    };
  }

  shouldBlockPreToolExecution(_context, params, method) {
    if (!this.relevantTools.includes(method)) return false;

    const providerId = params.rawParams?.providerId;
    if (!providerId) {
      this.lastBlockReason = 'Provider ID is required for reputation check';
      return true;
    }

    const result = this.evaluateProvider(providerId);
    if (!result.passed) {
      this.lastBlockReason = result.reason;
      return true;
    }

    this.lastBlockReason = null;
    return false;
  }
}
