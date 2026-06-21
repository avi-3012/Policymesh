import { AbstractHook } from '@hashgraph/hedera-agent-kit';

const SWAP_TOOLS = ['swap_hbar_to_fil', 'swap_hbar_to_akt', 'swap_hbar_to_usdc'];
const PROCUREMENT_TOOLS = [
  'procure_filecoin_storage',
  'procure_akash_compute',
  ...SWAP_TOOLS,
];

/**
 * Provides exchange rates for token swaps, cached for 5 minutes.
 */
export class PriceOracleHook extends AbstractHook {
  constructor(saucerSwapService, cacheTtlMs = 300000) {
    super();
    this.name = 'Price Oracle Hook';
    this.description = 'Fetches and caches HBAR exchange rates from SaucerSwap';
    this.relevantTools = PROCUREMENT_TOOLS;
    this.saucerSwapService = saucerSwapService;
    this.cacheTtlMs = cacheTtlMs;
    /** @type {Map<string, { rate: object, fetchedAt: number }>} */
    this.cache = new Map();
  }

  tokenForTool(method) {
    if (method.includes('usdc')) return 'USDC';
    if (method.includes('fil')) return 'FIL';
    if (method.includes('akt')) return 'AKT';
    if (method === 'procure_filecoin_storage') return 'FIL';
    if (method === 'procure_akash_compute') return 'AKT';
    return null;
  }

  async getRate(token) {
    const cached = this.cache.get(token);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return { ...cached.rate, cached: true };
    }

    const rate = await this.saucerSwapService.getExchangeRate(token);
    this.cache.set(token, { rate, fetchedAt: Date.now() });
    return { ...rate, cached: false };
  }

  async preToolExecutionHook(_context, params, method) {
    if (!this.relevantTools.includes(method)) return;

    const token = this.tokenForTool(method);
    if (!token) return;

    const rate = await this.getRate(token);
    params.rawParams._oracleRate = rate;

    await this.logRateUsage(method, rate, params.rawParams);
  }

  async logRateUsage(method, rate, rawParams) {
    this.lastLoggedRate = {
      tool: method,
      rate,
      procurementId: rawParams.procurementId,
      timestamp: new Date().toISOString(),
    };
  }

  getLastLoggedRate() {
    return this.lastLoggedRate ?? null;
  }
}
