import { SaucerSwapApiClient } from './clients/SaucerSwapApiClient.js';

/**
 * SaucerSwap DEX + CoinGecko oracle for HBAR → FIL / AKT.
 * Live mode fetches real market rates; swaps record live quotes (on-chain swap needs token association).
 */
export class SaucerSwapService {
  constructor({ demoMode = true, liveEnabled = false, saucerConfig = {}, priceConfig = {} } = {}) {
    this.demoMode = demoMode;
    this.liveEnabled = liveEnabled && !demoMode;
    this.defaultSlippage = 0.01;
    this.apiClient = new SaucerSwapApiClient({
      ...saucerConfig,
      coingeckoUrl: priceConfig.coingeckoUrl,
      coingeckoApiKey: priceConfig.apiKey,
    });

    this.rates = {
      FIL: { hbarPerFil: 12.5, lastUpdated: Date.now() },
      AKT: { hbarPerAkt: 0.85, lastUpdated: Date.now() },
    };
    this.lastRateSource = 'seed';
  }

  async getExchangeRate(token) {
    if (!this.rates[token]) {
      throw new Error(`Unsupported swap token: ${token}`);
    }

    if (this.liveEnabled) {
      try {
        const live = await this.apiClient.getHbarToTokenRate(token);
        const key = token === 'FIL' ? 'hbarPerFil' : 'hbarPerAkt';
        this.rates[token] = { [key]: live.hbarPerToken, lastUpdated: Date.now() };
        this.lastRateSource = live.source;
      } catch (err) {
        console.warn('[SaucerSwapService] Live rate fetch failed:', err.message);
      }
    }

    const rate = this.rates[token];
    return {
      token,
      hbarPerToken: rate.hbarPerFil ?? rate.hbarPerAkt,
      tokensPerHbar: 1 / (rate.hbarPerFil ?? rate.hbarPerAkt),
      lastUpdated: new Date(rate.lastUpdated).toISOString(),
      source: this.liveEnabled ? this.lastRateSource : 'demo-oracle',
      liveEnabled: this.liveEnabled,
    };
  }

  calculateSwapOutput(hbarAmount, token) {
    const rate = this.rates[token];
    const hbarPerToken = rate.hbarPerFil ?? rate.hbarPerAkt;
    const outputAmount = hbarAmount / hbarPerToken;
    const minOutput = outputAmount * (1 - this.defaultSlippage);

    return {
      inputHBAR: hbarAmount,
      outputToken: token,
      outputAmount,
      minOutputAmount: minOutput,
      exchangeRate: hbarPerToken,
      slippage: this.defaultSlippage,
      rateSource: this.lastRateSource,
    };
  }

  async swapHBARToToken(hbarAmount, token) {
    await this.getExchangeRate(token);
    const quote = this.calculateSwapOutput(hbarAmount, token);

    if (!this.liveEnabled) {
      return {
        success: true,
        transactionHash: `demo-swap-${token.toLowerCase()}-${Date.now()}`,
        ...quote,
        demoMode: true,
        swapType: 'simulated',
      };
    }

    return {
      success: true,
      transactionHash: `live-quote-${token.toLowerCase()}-${Date.now()}`,
      ...quote,
      demoMode: false,
      swapType: 'live-quoted',
      note:
        'Rate from CoinGecko + Hedera/SaucerSwap oracle. On-chain SaucerSwap execution requires WHBAR/token association on operator account.',
      saucerSwapRouter: this.apiClient.routerId,
      saucerSwapQuoter: this.apiClient.quoterId,
    };
  }
}
