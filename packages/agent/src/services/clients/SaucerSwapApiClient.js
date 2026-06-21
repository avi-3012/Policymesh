import { fetchJson, tokenIdToEvmAddress } from '../../lib/http.js';

/**
 * SaucerSwap + price oracle integration for HBAR→FIL/AKT rates.
 * Uses CoinGecko for cross-asset rates and Hedera JSON-RPC for on-chain SaucerSwap quotes.
 */
export class SaucerSwapApiClient {
  constructor({
    rpcUrl = 'https://testnet.hashio.io/api',
    routerId = '0.0.19264',
    quoterId = '0.0.1390002',
    whbarTokenId = '0.0.15058',
    usdcTokenId = '0.0.429274',
    coingeckoUrl = 'https://api.coingecko.com/api/v3',
    coingeckoApiKey = null,
    apiKey = null,
  } = {}) {
    this.rpcUrl = rpcUrl;
    this.routerId = routerId;
    this.quoterId = quoterId;
    this.whbarTokenId = whbarTokenId;
    this.usdcTokenId = usdcTokenId;
    this.coingeckoUrl = coingeckoUrl.replace(/\/$/, '');
    this.coingeckoApiKey = coingeckoApiKey;
    this.apiKey = apiKey;
  }

  async getCoinGeckoRates() {
    const headers = {};
    if (this.coingeckoApiKey) headers['x-cg-demo-api-key'] = this.coingeckoApiKey;

    const url = `${this.coingeckoUrl}/simple/price?ids=hedera-hashgraph,filecoin,akash-network,usd-coin&vs_currencies=usd`;
    const data = await fetchJson(url, { headers });

    const hbarUsd = data['hedera-hashgraph']?.usd;
    const filUsd = data.filecoin?.usd;
    const aktUsd = data['akash-network']?.usd;
    const usdcUsd = data['usd-coin']?.usd ?? 1;

    if (!hbarUsd || !filUsd || !aktUsd) {
      throw new Error('Incomplete CoinGecko price data');
    }

    return {
      hbarUsd,
      filUsd,
      aktUsd,
      usdcUsd,
      hbarPerFil: filUsd / hbarUsd,
      hbarPerAkt: aktUsd / hbarUsd,
      usdcPerHbar: hbarUsd / usdcUsd,
      source: 'coingecko',
    };
  }

  async getHbarToUsdcRate() {
    const gecko = await this.getCoinGeckoRates();
    return {
      usdcPerHbar: gecko.usdcPerHbar,
      hbarPerUsdc: 1 / gecko.usdcPerHbar,
      tokenId: this.usdcTokenId,
      source: 'coingecko',
    };
  }

  /**
   * Query SaucerSwap V1 router getAmountsOut via Hedera JSON-RPC (eth_call).
   */
  async getRouterQuote(amountInTinybar, pathTokenIds) {
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(this.rpcUrl, undefined, {
      batchMaxCount: 1,
    });

    const routerEvm = tokenIdToEvmAddress(this.routerId);
    const abi = [
      'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
    ];
    const iface = new ethers.Interface(abi);
    const path = pathTokenIds.map(tokenIdToEvmAddress);
    const data = iface.encodeFunctionData('getAmountsOut', [
      BigInt(amountInTinybar),
      path,
    ]);

    const result = await provider.call({ to: routerEvm, data });
    const decoded = iface.decodeFunctionResult('getAmountsOut', result);
    return decoded[0].map((v) => v.toString());
  }

  async getHbarToTokenRate(token) {
    const gecko = await this.getCoinGeckoRates();
    if (token === 'FIL') {
      return { hbarPerToken: gecko.hbarPerFil, source: 'coingecko+hedera' };
    }
    if (token === 'AKT') {
      return { hbarPerToken: gecko.hbarPerAkt, source: 'coingecko+hedera' };
    }
    throw new Error(`Unsupported token: ${token}`);
  }
}
