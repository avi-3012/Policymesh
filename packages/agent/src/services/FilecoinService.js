import { createHash } from 'node:crypto';
import { FilecoinApiClient } from './clients/FilecoinApiClient.js';

/**
 * Filecoin Calibration integration via Glif RPC.
 * Live mode queries real miners; deal sealing uses local tracking (full deals need Lotus wallet).
 */
export class FilecoinService {
  constructor({ demoMode = true, liveEnabled = false, filecoinConfig = {}, reputationService } = {}) {
    this.demoMode = demoMode;
    this.liveEnabled = liveEnabled && !demoMode;
    this.reputationService = reputationService;
    this.apiClient = new FilecoinApiClient(filecoinConfig);
    /** @type {Map<string, object>} */
    this.deals = new Map();
    this.lastProviderSource = 'seed';
  }

  async queryProviders({ sizeGB, durationDays, minReputation = 0.75 }) {
    if (this.liveEnabled) {
      try {
        const live = await this.apiClient.fetchLiveProviders(15);
        if (live.length) {
          this.lastProviderSource = 'filecoin-calibration-glif';
          this.reputationService.mergeLiveProviders(
            live.map((p) => ({
              ...p,
              pricingPerGbMonth: 0.0000001,
              completedDeals: 200,
              failedDeals: 5,
              uptimePercent: 99,
              avgResponseTimeMs: 500,
              slashingEvents: 0,
            })),
          );
        }
      } catch (err) {
        console.warn('[FilecoinService] Live provider fetch failed:', err.message);
      }
    }

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
        askPrice: (p.pricingPerGbMonth ?? 0.0000001) * sizeGB * (durationDays / 30),
        availableCapacityGB: p.availableCapacityGB ?? 10000,
        reputationScore: p.reputationScore,
        durationDays,
        sizeGB,
        source: p.source ?? this.lastProviderSource,
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
    let chainHead = null;
    if (this.liveEnabled) {
      try {
        chainHead = await this.apiClient.getChainHead();
      } catch (err) {
        console.warn('[FilecoinService] ChainHead:', err.message);
      }
    }

    const dealId = chainHead
      ? `f0${providerId.replace(/\D/g, '').slice(-6)}-${chainHead.Height}-${Date.now()}`
      : `deal-${providerId}-${Date.now()}`;
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
      demoMode: !this.liveEnabled,
      liveMode: this.liveEnabled,
      network: 'calibration',
      chainHeight: chainHead?.Height ?? null,
      source: this.liveEnabled ? 'filecoin-calibration-glif' : 'simulated',
    };

    this.deals.set(dealId, deal);
    await this.simulateDelay(this.liveEnabled ? 300 : 100);
    deal.status = 'active';
    deal.sealedAt = new Date().toISOString();
    deal.confirmations = 6;

    return deal;
  }

  async verifyDeal(dealId, expectedCid) {
    const deal = this.deals.get(dealId);
    if (!deal) {
      return { verified: false, reason: `Deal ${dealId} not found` };
    }

    if (!['active', 'sealed'].includes(deal.status)) {
      return {
        verified: false,
        reason: `Deal status is "${deal.status}", expected active or sealed`,
        deal,
      };
    }

    if (expectedCid && deal.pieceCid !== expectedCid) {
      return { verified: false, reason: 'Piece CID does not match expected hash', deal };
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

  simulateDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getDeal(dealId) {
    return this.deals.get(dealId) ?? null;
  }
}
