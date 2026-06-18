import { AbstractPolicy } from '@hashgraph/hedera-agent-kit';

const PROCUREMENT_TOOLS = [
  'procure_filecoin_storage',
  'procure_akash_compute',
  'swap_hbar_to_fil',
  'swap_hbar_to_akt',
];

/**
 * Enforces spending limits: per-procurement, daily, and monthly caps.
 * Lifecycle stage: postParamNormalization
 */
export class BudgetPolicy extends AbstractPolicy {
  constructor(options = {}, spendTracker) {
    super();
    this.name = 'Budget Policy';
    this.description =
      'Enforces per-procurement, daily, and monthly HBAR spending limits';
    this.relevantTools = PROCUREMENT_TOOLS;

    this.maxPerProcurement = options.maxPerProcurement ?? 500;
    this.maxDailySpend = options.maxDailySpend ?? 2000;
    this.maxMonthlySpend = options.maxMonthlySpend ?? 20000;
    this.minProcurementAmount = options.minProcurementAmount ?? 10;
    this.spendTracker = spendTracker;

    /** @type {string | null} */
    this.lastBlockReason = null;
  }

  /**
   * Extract HBAR amount from normalized procurement params.
   */
  extractAmount(normalisedParams) {
    if (normalisedParams.maxCostHBAR != null) {
      return Number(normalisedParams.maxCostHBAR);
    }
    if (normalisedParams.amountHBAR != null) {
      return Number(normalisedParams.amountHBAR);
    }
    if (normalisedParams.estimatedCostHBAR != null) {
      return Number(normalisedParams.estimatedCostHBAR);
    }
    return null;
  }

  evaluateBudget(amount) {
    if (amount < this.minProcurementAmount) {
      return {
        blocked: true,
        reason: `Requested amount ${amount} HBAR is below minimum procurement amount of ${this.minProcurementAmount} HBAR`,
      };
    }

    if (amount > this.maxPerProcurement) {
      return {
        blocked: true,
        reason: `Requested amount ${amount} HBAR exceeds per-procurement limit of ${this.maxPerProcurement} HBAR`,
      };
    }

    const dailySpend = this.spendTracker.getDailySpend();
    if (dailySpend + amount > this.maxDailySpend) {
      const resetAt = new Date();
      resetAt.setHours(24, 0, 0, 0);
      return {
        blocked: true,
        reason: `Daily spend limit exceeded: ${dailySpend} HBAR used today, ${amount} HBAR requested, limit is ${this.maxDailySpend} HBAR. Resets at midnight UTC.`,
      };
    }

    const monthlySpend = this.spendTracker.getMonthlySpend();
    if (monthlySpend + amount > this.maxMonthlySpend) {
      return {
        blocked: true,
        reason: `Monthly spend limit exceeded: ${monthlySpend} HBAR used in rolling 30-day window, ${amount} HBAR requested, limit is ${this.maxMonthlySpend} HBAR`,
      };
    }

    return { blocked: false, reason: null };
  }

  /**
   * Standalone evaluation for REST API (outside tool lifecycle).
   */
  checkProcurement(amountHBAR) {
    const result = this.evaluateBudget(Number(amountHBAR));
    return {
      policy: 'BudgetPolicy',
      passed: !result.blocked,
      reason: result.reason,
      limits: {
        maxPerProcurement: this.maxPerProcurement,
        maxDailySpend: this.maxDailySpend,
        maxMonthlySpend: this.maxMonthlySpend,
        minProcurementAmount: this.minProcurementAmount,
      },
      usage: this.spendTracker.getBudgetStatus({
        maxDailySpend: this.maxDailySpend,
        maxMonthlySpend: this.maxMonthlySpend,
      }),
    };
  }

  updateConfig(options) {
    if (options.maxPerProcurement != null) {
      this.maxPerProcurement = options.maxPerProcurement;
    }
    if (options.maxDailySpend != null) {
      this.maxDailySpend = options.maxDailySpend;
    }
    if (options.maxMonthlySpend != null) {
      this.maxMonthlySpend = options.maxMonthlySpend;
    }
    if (options.minProcurementAmount != null) {
      this.minProcurementAmount = options.minProcurementAmount;
    }
  }

  getConfig() {
    return {
      maxPerProcurement: this.maxPerProcurement,
      maxDailySpend: this.maxDailySpend,
      maxMonthlySpend: this.maxMonthlySpend,
      minProcurementAmount: this.minProcurementAmount,
    };
  }

  shouldBlockPostParamsNormalization(context, params, method) {
    if (!this.relevantTools.includes(method)) {
      return false;
    }

    const amount = this.extractAmount(params.normalisedParams);
    if (amount == null || Number.isNaN(amount)) {
      this.lastBlockReason = 'Missing or invalid HBAR amount in procurement request';
      return true;
    }

    const result = this.evaluateBudget(amount);
    if (result.blocked) {
      this.lastBlockReason = result.reason;
      return true;
    }

    this.lastBlockReason = null;
    return false;
  }
}
