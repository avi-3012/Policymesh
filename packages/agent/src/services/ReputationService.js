/**
 * Provider reputation registry with HCS-backed data and local cache.
 */
export class ReputationService {
  constructor({ hcsService, cacheTtlMs = 3600000 }) {
    this.hcsService = hcsService;
    this.cacheTtlMs = cacheTtlMs;
    /** @type {Map<string, { data: object, fetchedAt: number }>} */
    this.cache = new Map();

    // Seed demo providers for testnet demos
    this.seedProviders();
  }

  seedProviders() {
    const providers = [
      {
        id: 'f01234',
        serviceType: 'filecoin-storage',
        reputationScore: 0.92,
        completedDeals: 1200,
        failedDeals: 12,
        uptimePercent: 99.5,
        avgResponseTimeMs: 450,
        verificationLevel: 'verified',
        slashingEvents: 0,
        pricingPerGbMonth: 0.0000001,
        available: true,
      },
      {
        id: 'f05678',
        serviceType: 'filecoin-storage',
        reputationScore: 0.58,
        completedDeals: 30,
        failedDeals: 8,
        uptimePercent: 85.0,
        avgResponseTimeMs: 2000,
        verificationLevel: 'unverified',
        slashingEvents: 3,
        pricingPerGbMonth: 0.00000005,
        available: true,
      },
      {
        id: 'akash-provider-1',
        serviceType: 'akash-compute',
        reputationScore: 0.88,
        completedDeals: 450,
        failedDeals: 15,
        uptimePercent: 98.2,
        avgResponseTimeMs: 600,
        verificationLevel: 'verified',
        slashingEvents: 0,
        pricingPerCpuHour: 0.5,
        available: true,
      },
      {
        id: 'akash-gpu-1',
        serviceType: 'akash-gpu',
        reputationScore: 0.81,
        completedDeals: 80,
        failedDeals: 4,
        uptimePercent: 96.0,
        avgResponseTimeMs: 900,
        verificationLevel: 'verified',
        slashingEvents: 1,
        pricingPerGpuHour: 2.5,
        available: true,
      },
    ];

    for (const p of providers) {
      this.cache.set(p.id, { data: p, fetchedAt: Date.now() });
    }
  }

  calculateScore(provider) {
    const totalDeals = provider.completedDeals + provider.failedDeals;
    const successRate = totalDeals > 0 ? provider.completedDeals / totalDeals : 0;
    const base = successRate * 0.6;
    const uptimeBonus = (provider.uptimePercent / 100) * 0.2;
    const responseBonus = Math.max(0, 1 - provider.avgResponseTimeMs / 5000) * 0.1;
    const verificationBonus = provider.verificationLevel === 'verified' ? 0.1 : 0;
    return Math.min(1, base + uptimeBonus + responseBonus + verificationBonus);
  }

  getProvider(providerId) {
    const cached = this.cache.get(providerId);
    if (!cached) return null;
    return { ...cached.data, reputationScore: this.calculateScore(cached.data) };
  }

  listProviders({ serviceType, minReputation = 0, availableOnly = false, sortBy = 'reputation' } = {}) {
    let providers = [...this.cache.values()].map((c) => ({
      ...c.data,
      reputationScore: this.calculateScore(c.data),
    }));

    if (serviceType) {
      providers = providers.filter((p) => p.serviceType === serviceType);
    }
    if (minReputation > 0) {
      providers = providers.filter((p) => p.reputationScore >= minReputation);
    }
    if (availableOnly) {
      providers = providers.filter((p) => p.available);
    }

    if (sortBy === 'price') {
      providers.sort((a, b) => {
        const priceA = a.pricingPerGbMonth ?? a.pricingPerCpuHour ?? a.pricingPerGpuHour ?? 0;
        const priceB = b.pricingPerGbMonth ?? b.pricingPerCpuHour ?? b.pricingPerGpuHour ?? 0;
        return priceA - priceB;
      });
    } else {
      providers.sort((a, b) => b.reputationScore - a.reputationScore);
    }

    return providers;
  }

  isBlacklisted(_providerId) {
    return false;
  }

  /**
   * Merge providers from live Filecoin/Akash APIs into the local cache.
   * Existing seed entries are kept; live entries override by id.
   */
  mergeLiveProviders(providers) {
    for (const p of providers) {
      const existing = this.cache.get(p.id)?.data ?? {};
      this.cache.set(p.id, {
        data: { ...existing, ...p, reputationScore: undefined },
        fetchedAt: Date.now(),
      });
    }
  }
}
