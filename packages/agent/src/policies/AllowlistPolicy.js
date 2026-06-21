import { AbstractPolicy } from '@hashgraph/hedera-agent-kit';

const PROCUREMENT_TOOLS = [
  'procure_filecoin_storage',
  'procure_akash_compute',
];

/**
 * Allowed Counterparties (whitelist) — only approved Filecoin miners / Akash providers.
 * Lifecycle stage: preToolExecution + REST evaluation when providerId is set.
 */
export class AllowlistPolicy extends AbstractPolicy {
  constructor(options = {}) {
    super();
    this.name = 'Allowlist Policy';
    this.description = 'Only allows procurement with approved provider counterparties';
    this.relevantTools = PROCUREMENT_TOOLS;

    this.enabled = options.enabled !== false;
    this.allowedProviders = new Set(options.allowedProviders ?? []);
    this.lastBlockReason = null;
  }

  isAllowed(providerId) {
    if (!this.enabled || this.allowedProviders.size === 0) {
      return true;
    }
    return this.allowedProviders.has(providerId);
  }

  evaluateProvider(providerId) {
    if (!providerId) {
      return {
        policy: 'AllowlistPolicy',
        passed: false,
        reason: 'No provider specified',
      };
    }

    if (!this.isAllowed(providerId)) {
      return {
        policy: 'AllowlistPolicy',
        passed: false,
        reason: `Provider ${providerId} is not in the allowed counterparties list`,
        allowedProviders: [...this.allowedProviders],
      };
    }

    return {
      policy: 'AllowlistPolicy',
      passed: true,
      reason: null,
    };
  }

  /**
   * @param {Array<{ id?: string, providerId?: string } | string>} items
   */
  filterProviders(items, idKey = 'id') {
    if (!this.enabled || this.allowedProviders.size === 0) {
      return items;
    }

    return items.filter((item) => {
      const id = typeof item === 'string' ? item : (item[idKey] ?? item.providerId ?? item.id);
      return id && this.isAllowed(id);
    });
  }

  updateConfig(options) {
    if (options.enabled != null) this.enabled = options.enabled;
    if (Array.isArray(options.allowedProviders)) {
      this.allowedProviders = new Set(options.allowedProviders.filter(Boolean));
    }
  }

  getConfig() {
    return {
      enabled: this.enabled,
      allowedProviders: [...this.allowedProviders],
    };
  }

  shouldBlockPreToolExecution(_context, params, method) {
    if (!this.relevantTools.includes(method) || !this.enabled) {
      return false;
    }

    const providerId = params.rawParams?.providerId ?? params.rawParams?.minerId;
    if (!providerId) {
      return false;
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
