import { createHash } from 'node:crypto';

/**
 * Filecoin storage integration for Calibration testnet.
 * Demo mode simulates deal lifecycle with realistic responses.
 */
export class FilecoinService {
  constructor({ demoMode = true, reputationService } = {}) {
    this.demoMode = demoMode;
    this.reputationService = reputationService;
    /** @type {Map<string, object>} */
    this.deals = new Map();
  }

  async queryProviders({ sizeGB, durationDays, minReputation = 0.75 }) {
    const providers = this.reputationService.listProviders({
      serviceType: 'filecoin-storage',
      minReputation,
      availableOnly: true,
      sortBy: 'reputation',
    });

    return providers
      .filter((p) => p.available)
      .map((p) => ({
        providerId: p.id,
        askPrice: p.pricingPerGbMonth * sizeGB * (durationDays / 30),
        availableCapacityGB: 10000,
        reputationScore: p.reputationScore,
        durationDays,
        sizeGB,
      }));
  }

  selectProvider(candidates, preferredId) {
    if (preferredId) {
      const preferred = candidates.find((c) => c.providerId === preferredId);
      if (preferred) return preferred;
    }
    return candidates.sort((a, b) => b.reputationScore - a.reputationScore)[0] ?? null;
  }

  generateCid(payload) {
    const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return `bafy${hash.slice(0, 44)}`;
  }

  async createStorageDeal({ providerId, sizeGB, durationDays, filAmount, procurementId }) {
    const dealId = `deal-${providerId}-${Date.now()}`;
    const pieceCid = this.generateCid({ providerId, sizeGB, durationDays, procurementId });

    const deal = {
      dealId,
      providerId,
      pieceCid,
      sizeGB,
      durationDays,
      filAmount,
      status: 'proposed',
      procurementId,
      createdAt: new Date().toISOString(),
      demoMode: this.demoMode,
    };

    this.deals.set(dealId, deal);

    // Simulate provider acceptance
    await this.simulateDelay(100);
    deal.status = 'active';
    deal.sealedAt = new Date().toISOString();
    deal.confirmations = 6;

    return deal;
  }

  async verifyDeal(dealId, expectedCid) {
    const deal = this.deals.get(dealId);
    if (!deal) {
      return { verified: false, reason: `Deal ${dealId} not found on-chain` };
    }

    if (!['active', 'sealed'].includes(deal.status)) {
      return {
        verified: false,
        reason: `Deal status is "${deal.status}", expected active or sealed`,
        deal,
      };
    }

    if (expectedCid && deal.pieceCid !== expectedCid) {
      return {
        verified: false,
        reason: 'Piece CID does not match expected hash',
        deal,
      };
    }

    if ((deal.confirmations ?? 0) < 6) {
      return {
        verified: false,
        reason: `Insufficient confirmations: ${deal.confirmations ?? 0}/6`,
        deal,
      };
    }

    return { verified: true, deal };
  }

  async simulateProviderFailure(providerId) {
    return {
      dealId: `failed-${providerId}-${Date.now()}`,
      providerId,
      status: 'failed',
      reason: 'Provider failed to accept deal within timeout',
    };
  }

  simulateDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getDeal(dealId) {
    return this.deals.get(dealId) ?? null;
  }
}
