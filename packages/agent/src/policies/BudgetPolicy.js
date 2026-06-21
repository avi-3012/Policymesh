import { AbstractPolicy } from '@hashgraph/hedera-agent-kit';

const PROCUREMENT_TOOLS = [
  'procure_filecoin_storage',
  'procure_akash_compute',
  'swap_hbar_to_fil',
  'swap_hbar_to_akt',
  'swap_hbar_to_usdc',
];

/**
 * Enforces spending limits for HBAR and USDC (HTS) procurement.
 * Lifecycle stage: postParamNormalization
 */
export class BudgetPolicy extends AbstractPolicy {
  constructor(options = {}, spendTracker) {
    super();
    this.name = 'Budget Policy';
    this.description =
      'Enforces per-procurement, daily, and monthly limits for HBAR and USDC payments';
    this.relevantTools = PROCUREMENT_TOOLS;

    this.maxPerProcurement = options.maxPerProcurement ?? 500;
    this.maxDailySpend = options.maxDailySpend ?? 2000;
    this.maxMonthlySpend = options.maxMonthlySpend ?? 20000;
    this.minProcurementAmount = options.minProcurementAmount ?? 10;

    this.usdcTokenId = options.usdcTokenId ?? '0.0.429274';
    this.maxUSDCPerProcurement = options.maxUSDCPerProcurement ?? 100;
    this.minUSDCProcurementAmount = options.minUSDCProcurementAmount ?? 1;

    this.spendTracker = spendTracker;
    this.lastBlockReason = null;

    this.approvedTokens = {
      HBAR: {
        decimals: 8,
        maxAmount: this.maxPerProcurement,
      },
      USDC: {
        tokenId: this.usdcTokenId,
        decimals: 6,
        maxAmount: this.maxUSDCPerProcurement,
      },
    };
  }

  normalizePaymentToken(token) {
    if (!token || token === 'HBAR') return 'HBAR';
    if (token === 'USDC' || token === this.usdcTokenId) return 'USDC';
    return String(token).toUpperCase();
  }

  extractAmountAndToken(normalisedParams) {
    const token = this.normalizePaymentToken(
      normalisedParams.paymentToken ?? normalisedParams.token,
    );

    if (token === 'USDC') {
      const amount =
        normalisedParams.maxCostUSDC ??
        normalisedParams.amountUSDC ??
        normalisedParams.amount;
      return { token: 'USDC', amount: amount != null ? Number(amount) : null };
    }

    const amount = this.extractHbarAmount(normalisedParams);
    return { token: 'HBAR', amount };
  }

  extractHbarAmount(normalisedParams) {
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

  evaluateUsdcBudget(amount) {
    const max = this.approvedTokens.USDC.maxAmount;

    if (amount < this.minUSDCProcurementAmount) {
      return {
        blocked: true,
        reason: `Requested amount ${amount} USDC is below minimum of ${this.minUSDCProcurementAmount} USDC`,
      };
    }

    if (amount > max) {
      return {
        blocked: true,
        reason: `USDC amount ${amount} exceeds max ${max} USDC per procurement`,
      };
    }

    return { blocked: false, reason: null };
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

  checkProcurement(amount, paymentToken = 'HBAR') {
    const token = this.normalizePaymentToken(paymentToken);
    const result =
      token === 'USDC' ? this.evaluateUsdcBudget(Number(amount)) : this.evaluateBudget(Number(amount));

    return {
      policy: 'BudgetPolicy',
      passed: !result.blocked,
      reason: result.reason,
      paymentToken: token,
      limits:
        token === 'USDC'
          ? {
              maxUSDCPerProcurement: this.maxUSDCPerProcurement,
              minUSDCProcurementAmount: this.minUSDCProcurementAmount,
              usdcTokenId: this.usdcTokenId,
            }
          : {
              maxPerProcurement: this.maxPerProcurement,
              maxDailySpend: this.maxDailySpend,
              maxMonthlySpend: this.maxMonthlySpend,
              minProcurementAmount: this.minProcurementAmount,
            },
      approvedTokens: this.getApprovedTokensConfig(),
      usage:
        token === 'HBAR'
          ? this.spendTracker.getBudgetStatus({
              maxDailySpend: this.maxDailySpend,
              maxMonthlySpend: this.maxMonthlySpend,
            })
          : null,
    };
  }

  getApprovedTokensConfig() {
    return {
      HBAR: { ...this.approvedTokens.HBAR, maxAmount: this.maxPerProcurement },
      USDC: {
        ...this.approvedTokens.USDC,
        tokenId: this.usdcTokenId,
        maxAmount: this.maxUSDCPerProcurement,
      },
    };
  }

  updateConfig(options) {
    if (options.maxPerProcurement != null) {
      this.maxPerProcurement = options.maxPerProcurement;
      this.approvedTokens.HBAR.maxAmount = options.maxPerProcurement;
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
    if (options.maxUSDCPerProcurement != null) {
      this.maxUSDCPerProcurement = options.maxUSDCPerProcurement;
      this.approvedTokens.USDC.maxAmount = options.maxUSDCPerProcurement;
    }
    if (options.minUSDCProcurementAmount != null) {
      this.minUSDCProcurementAmount = options.minUSDCProcurementAmount;
    }
    if (options.usdcTokenId != null) {
      this.usdcTokenId = options.usdcTokenId;
      this.approvedTokens.USDC.tokenId = options.usdcTokenId;
    }
  }

  getConfig() {
    return {
      maxPerProcurement: this.maxPerProcurement,
      maxDailySpend: this.maxDailySpend,
      maxMonthlySpend: this.maxMonthlySpend,
      minProcurementAmount: this.minProcurementAmount,
      maxUSDCPerProcurement: this.maxUSDCPerProcurement,
      minUSDCProcurementAmount: this.minUSDCProcurementAmount,
      usdcTokenId: this.usdcTokenId,
      approvedTokens: this.getApprovedTokensConfig(),
    };
  }

  shouldBlockPostParamsNormalization(_context, params, method) {
    if (!this.relevantTools.includes(method)) {
      return false;
    }

    const { token, amount } = this.extractAmountAndToken(params.normalisedParams);
    if (amount == null || Number.isNaN(amount)) {
      this.lastBlockReason = `Missing or invalid ${token} amount in procurement request`;
      return true;
    }

    const result = token === 'USDC' ? this.evaluateUsdcBudget(amount) : this.evaluateBudget(amount);
    if (result.blocked) {
      this.lastBlockReason = result.reason;
      return true;
    }

    this.lastBlockReason = null;
    return false;
  }
}
