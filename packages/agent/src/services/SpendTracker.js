/**
 * Tracks procurement spending for budget policy enforcement.
 * Phase 1: in-memory store. Phase 2 will sync with HCS audit log.
 */
export class SpendTracker {
  constructor() {
    /** @type {Array<{ amountHBAR: number, timestamp: Date, procurementId?: string }>} */
    this.records = [];
  }

  recordSpend(amountHBAR, procurementId) {
    this.records.push({
      amountHBAR,
      timestamp: new Date(),
      procurementId,
    });
  }

  getDailySpend(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.sumInRange(start, end);
  }

  getMonthlySpend(date = new Date()) {
    const end = new Date(date);
    const start = new Date(date);
    start.setDate(start.getDate() - 30);

    return this.sumInRange(start, end);
  }

  sumInRange(start, end) {
    return this.records
      .filter((r) => r.timestamp >= start && r.timestamp <= end)
      .reduce((sum, r) => sum + r.amountHBAR, 0);
  }

  getBudgetStatus(limits) {
    const dailySpend = this.getDailySpend();
    const monthlySpend = this.getMonthlySpend();

    return {
      dailySpend,
      dailyLimit: limits.maxDailySpend,
      monthlySpend,
      monthlyLimit: limits.maxMonthlySpend,
      remainingDaily: Math.max(0, limits.maxDailySpend - dailySpend),
      remainingMonthly: Math.max(0, limits.maxMonthlySpend - monthlySpend),
    };
  }

  reset() {
    this.records = [];
  }
}

export const spendTracker = new SpendTracker();
