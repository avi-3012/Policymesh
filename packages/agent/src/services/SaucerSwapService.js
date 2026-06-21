import { SaucerSwapApiClient } from './clients/SaucerSwapApiClient.js';

/**
 * SaucerSwap DEX + CoinGecko oracle for HBAR → FIL / AKT / USDC.
 * Live mode fetches real market rates; swaps record live quotes (on-chain swap needs token association).
 */
export class SaucerSwapService {
  constructor({ demoMode = true, liveEnabled = false, saucerConfig = {}, priceConfig = {} } = {}) {
    this.demoMode = demoMode;
    this.liveEnabled = liveEnabled && !demoMode;
    this.defaultSlippage = 0.01;
    this.usdcTokenId = saucerConfig.usdcTokenId ?? '0.0.429274';
    this.apiClient = new SaucerSwapApiClient({
      ...saucerConfig,
      coingeckoUrl: priceConfig.coingeckoUrl,
      coingeckoApiKey: priceConfig.apiKey,
    });

    this.rates = {
      FIL: { hbarPerFil: 12.5, lastUpdated: Date.now() },
      AKT: { hbarPerAkt: 0.85, lastUpdated: Date.now() },
      USDC: { usdcPerHbar: 0.05, lastUpdated: Date.now() },
    };
    this.lastRateSource = 'seed';
  }

  async getExchangeRate(token) {
    const normalized = token === this.usdcTokenId ? 'USDC' : token;

    if (!this.rates[normalized]) {
      throw new Error(`Unsupported swap token: ${token}`);
    }

    if (this.liveEnabled) {
      try {
        if (normalized === 'USDC') {
          const live = await this.apiClient.getHbarToUsdcRate();
          this.rates.USDC = { usdcPerHbar: live.usdcPerHbar, lastUpdated: Date.now() };
          this.lastRateSource = live.source;
        } else {
          const live = await this.apiClient.getHbarToTokenRate(normalized);
          const key = normalized === 'FIL' ? 'hbarPerFil' : 'hbarPerAkt';
          this.rates[normalized] = { [key]: live.hbarPerToken, lastUpdated: Date.now() };
          this.lastRateSource = live.source;
        }
      } catch (err) {
        console.warn('[SaucerSwapService] Live rate fetch failed:', err.message);
      }
    }

    if (normalized === 'USDC') {
      const rate = this.rates.USDC;
      return {
        token: 'USDC',
        usdcPerHbar: rate.usdcPerHbar,
        hbarPerToken: 1 / rate.usdcPerHbar,
        tokensPerHbar: rate.usdcPerHbar,
        tokenId: this.usdcTokenId,
        lastUpdated: new Date(rate.lastUpdated).toISOString(),
        source: this.liveEnabled ? this.lastRateSource : 'demo-oracle',
        liveEnabled: this.liveEnabled,
      };
    }

    const rate = this.rates[normalized];
    return {
      token: normalized,
      hbarPerToken: rate.hbarPerFil ?? rate.hbarPerAkt,
      tokensPerHbar: 1 / (rate.hbarPerFil ?? rate.hbarPerAkt),
      lastUpdated: new Date(rate.lastUpdated).toISOString(),
      source: this.liveEnabled ? this.lastRateSource : 'demo-oracle',
      liveEnabled: this.liveEnabled,
    };
  }

  /**
   * Cross-asset swap quote (HBAR→FIL/AKT/USDC).
   */
  async getSwapQuote(from, to, amount) {
    const fromToken = String(from).toUpperCase();
    const toToken = to === this.usdcTokenId ? 'USDC' : String(to).toUpperCase();

    if (fromToken === 'HBAR' && toToken === 'USDC') {
      const rateInfo = await this.getExchangeRate('USDC');
      const usdcPerHbar = rateInfo.usdcPerHbar ?? rateInfo.tokensPerHbar;
      const outputAmount = amount * usdcPerHbar * (1 - this.defaultSlippage);

      return {
        from: 'HBAR',
        to: 'USDC',
        inputAmount: amount,
        outputAmount,
        minOutputAmount: outputAmount,
        exchangeRate: usdcPerHbar,
        slippage: this.defaultSlippage,
        tokenId: this.usdcTokenId,
        route: this.liveEnabled ? 'HBAR→USDC (quoted)' : 'HBAR→USDC (simulated)',
        rateSource: this.lastRateSource,
        swapType: this.liveEnabled ? 'live-quoted' : 'simulated',
      };
    }

    if (fromToken === 'HBAR' && (toToken === 'FIL' || toToken === 'AKT')) {
      await this.getExchangeRate(toToken);
      const quote = this.calculateSwapOutput(amount, toToken);
      return {
        from: 'HBAR',
        to: toToken,
        inputAmount: quote.inputHBAR,
        outputAmount: quote.outputAmount,
        minOutputAmount: quote.minOutputAmount,
        exchangeRate: quote.exchangeRate,
        slippage: quote.slippage,
        route: `${fromToken}→${toToken}`,
        rateSource: quote.rateSource,
        swapType: this.liveEnabled ? 'live-quoted' : 'simulated',
      };
    }

    throw new Error(`Unsupported swap pair: ${from} → ${to}`);
  }

  calculateSwapOutput(hbarAmount, token) {
    const normalized = token === this.usdcTokenId ? 'USDC' : token;
    const rate = this.rates[normalized];

    if (normalized === 'USDC') {
      const outputAmount = hbarAmount * rate.usdcPerHbar;
      const minOutput = outputAmount * (1 - this.defaultSlippage);
      return {
        inputHBAR: hbarAmount,
        outputToken: 'USDC',
        outputAmount,
        minOutputAmount: minOutput,
        exchangeRate: rate.usdcPerHbar,
        slippage: this.defaultSlippage,
        rateSource: this.lastRateSource,
        tokenId: this.usdcTokenId,
      };
    }

    const hbarPerToken = rate.hbarPerFil ?? rate.hbarPerAkt;
    const outputAmount = hbarAmount / hbarPerToken;
    const minOutput = outputAmount * (1 - this.defaultSlippage);

    return {
      inputHBAR: hbarAmount,
      outputToken: normalized,
      outputAmount,
      minOutputAmount: minOutput,
      exchangeRate: hbarPerToken,
      slippage: this.defaultSlippage,
      rateSource: this.lastRateSource,
    };
  }

  async swapHBARToToken(hbarAmount, token) {
    const normalized = token === this.usdcTokenId ? 'USDC' : token;
    await this.getExchangeRate(normalized);
    const quote = this.calculateSwapOutput(hbarAmount, normalized);

    const base = {
      success: true,
      ...quote,
    };

    if (!this.liveEnabled) {
      return {
        ...base,
        transactionHash: `demo-swap-${normalized.toLowerCase()}-${Date.now()}`,
        demoMode: true,
        swapType: 'simulated',
        route: normalized === 'USDC' ? 'HBAR→USDC (simulated)' : undefined,
      };
    }

    return {
      ...base,
      transactionHash: `live-quote-${normalized.toLowerCase()}-${Date.now()}`,
      demoMode: false,
      swapType: 'live-quoted',
      route: normalized === 'USDC' ? 'HBAR→USDC (quoted)' : undefined,
      note:
        normalized === 'USDC'
          ? 'USDC rate from CoinGecko. On-chain HTS transfer requires token association on operator account.'
          : 'Rate from CoinGecko + Hedera/SaucerSwap oracle. On-chain SaucerSwap execution requires WHBAR/token association on operator account.',
      saucerSwapRouter: this.apiClient.routerId,
      saucerSwapQuoter: this.apiClient.quoterId,
    };
  }
}
