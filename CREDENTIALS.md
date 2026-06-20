# PolicyMesh credentials checklist

Paste your values into **`packages/agent/.env`**. This file is gitignored — never commit it.

## DEMO_MODE: `true` vs `false`

| | `DEMO_MODE=true` | `DEMO_MODE=false` |
|---|------------------|-------------------|
| **When** | No Hedera account, or offline dev | Hedera testnet account + keys configured |
| **Hedera client** | Disabled (`null`) | Connects to testnet |
| **HCS audit** | In-memory cache only | Writes to `HCS_AUDIT_TOPIC_ID` on chain |
| **Filecoin / Akash / SaucerSwap** | Simulated | Live APIs when `SERVICES_LIVE_MODE=true` (default) |
| **Policies** | Fully enforced | Fully enforced |
| **OpenAI agent** | Works if `OPENAI_API_KEY` set | Works if `OPENAI_API_KEY` set |

**Rule of thumb:** set `DEMO_MODE=false` when you have `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, and `HCS_AUDIT_TOPIC_ID` filled in.

Auto-fallback: if `DEMO_MODE` is unset but `HEDERA_ACCOUNT_ID` is missing, the app still runs in demo mode.

---

## Required for live Hedera (bounty demo)

| Variable | How to get |
|----------|------------|
| `HEDERA_ACCOUNT_ID` | [Hedera Portal](https://portal.hedera.com) testnet account |
| `HEDERA_PRIVATE_KEY` | Export when creating account (ECDSA `0x...` or DER) |
| `HCS_AUDIT_TOPIC_ID` | Run `npm run setup:hcs` (creates topic + updates `.env`) |

## Required for AI agent chat

| Variable | How to get |
|----------|------------|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

## Filecoin, Akash, SaucerSwap

| Service | API / RPC | Key required? |
|---------|-----------|---------------|
| **Filecoin** | Glif Calibration RPC (`FILECOIN_RPC_URL`) | Optional `FILECOIN_API_KEY` for premium RPC |
| **Akash** | [Console API](https://console-api.akash.network) provider list | Optional `AKASH_API_KEY` for JWT deployment endpoints |
| **SaucerSwap** | CoinGecko rates + Hedera testnet router via `SAUCERSWAP_RPC_URL` | Optional `COINGECKO_API_KEY`, `SAUCERSWAP_API_KEY` (reserved) |

Set `SERVICES_LIVE_MODE=false` to force simulation even with Hedera credentials.

**Live mode behavior:**

- **Filecoin** — queries real Calibration miners via Glif RPC; deals tracked locally with chain height
- **Akash** — fetches live providers from Console API
- **SaucerSwap** — live HBAR→FIL/AKT rates from CoinGecko; on-chain swap execution needs token association

Check integration status: `GET /api/status` → `servicesLiveMode` and `integrations`.

---

## Production deployment

| Variable | Where |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `packages/web/.env.local` → Render API URL |
| `WEB_UI_URL` | `packages/agent/.env` → Vercel dashboard URL |

See [SUBMISSION.md](./SUBMISSION.md) for full deploy checklist.

## Commands

```bash
npm run setup:hcs    # Create HCS topic (once)
npm run agent:dev    # API :3001
npm run web          # UI :3000
npm run verify       # Health + procurement smoke test
```
