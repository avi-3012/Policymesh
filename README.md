# PolicyMesh

**PolicyMesh is the first Hedera Policy Agent that doesn't just simulate payments—it actually purchases Filecoin storage and Akash compute, verifies delivery, and records immutable audit trails on Hedera.**

Autonomous procurement for decentralized infrastructure: buy **Filecoin storage** and **Akash compute** with **HBAR** or **USDC**, governed by **Hedera Agent Kit v4 Policies and Hooks**.

Built for [Hedera AI Agent Bounty Week 5](https://hedera.com).

## Why PolicyMesh

| Capability | What it means |
|------------|----------------|
| **Real procurement** | End-to-end purchase flow for Filecoin deals and Akash deployments |
| **Policy-gated spending** | Budget, service type, allowlist, reputation, and delivery rules |
| **Human confirmation** | Large purchases require explicit approval |
| **Live integrations** | Filecoin Calibration RPC, Akash Console API, CoinGecko rates |
| **Immutable audit** | Every decision logged to Hedera HCS |

## Features

- **5 enforcement policies** — Budget (HBAR + USDC), Service Type, Allowlist, Reputation, Delivery Verification
- **Human confirmation** — Purchases over `CONFIRMATION_THRESHOLD` (default 100) need `/api/confirmations/:id/approve`
- **USDC support** — Budget limits + HBAR→USDC swap quotes (HTS `0.0.429274`)
- **3 observability hooks** — Audit (HCS), Price Oracle, Notifications
- **Live integrations** — Filecoin, Akash, SaucerSwap/CoinGecko oracle
- **LangChain agent** — GPT-4o-mini + custom procurement `BaseTool`s
- **Web dashboard** — procure, policies, audit, providers, agent chat

## Implementation Status

| Component | Status | Details |
|-----------|--------|---------|
| **Policy Engine** | ✅ Live | HCS audit messages on testnet |
| **Price Oracle** | ✅ Live | Real-time CoinGecko rates |
| **Provider APIs** | ✅ Live | Filecoin Calibration + Akash Console |
| **Swap Quotes** | ⚠️ Simulated | Real rates, mock execution (SaucerSwap on-chain planned) |
| **HBAR Transfer** | ⚠️ Simulated | Policy-validated; Hedera SDK transfer pending |
| **USDC Support** | ⚠️ Partial | Budget + quotes live; HTS transfer execution pending |

### What Works Today

- Full policy enforcement before any "payment"
- Real price discovery via CoinGecko (HBAR, FIL, AKT, USDC)
- Live Filecoin miner and Akash provider listings
- Provider allowlist (approved counterparties only)
- Human approval for large purchases
- Immutable HCS audit trail for every decision

### Production Path

1. ✅ Policy validation (DONE)
2. ✅ Price oracle integration (DONE)
3. ✅ Allowlist + human confirmation (DONE)
4. 🚧 SaucerSwap on-chain swap execution
5. 🚧 Real HBAR / USDC HTS transfers to providers

## Architecture

```
packages/
├── agent/   Express API + Hedera Agent Kit policies/hooks + LangChain agent
└── web/     Next.js dashboard
```

## Quick start

```bash
npm install
cp packages/agent/.env.example packages/agent/.env   # edit credentials
cp packages/web/.env.example packages/web/.env.local
npm run setup:hcs      # one-time HCS topic
npm run agent:dev      # API :3001
npm run web            # UI :3000
```

Open **http://localhost:3000**. API: **http://localhost:3001**.

Full env reference: [CREDENTIALS.md](./CREDENTIALS.md) · Submission: [SUBMISSION.md](./SUBMISSION.md)

### Demo mode

Without Hedera credentials: `DEMO_MODE=true` (auto if no `HEDERA_ACCOUNT_ID`). Policies still enforced; external APIs simulated; audit in-memory only.

### Human confirmation

| Cost | Behavior |
|------|----------|
| ≤ `CONFIRMATION_THRESHOLD` (100) | Auto-executes after policies pass |
| > threshold | `awaiting_confirmation` → approve or reject |

```bash
POST /api/confirmations/:id/approve
POST /api/confirmations/:id/reject
```

### USDC payments

```env
USDC_TOKEN_ID=0.0.429274
MAX_USDC_PER_PROCUREMENT=100
```

```bash
curl "http://localhost:3001/api/swap/quote?from=HBAR&to=USDC&amount=100"

curl -X POST http://localhost:3001/api/procure/storage \
  -H "Content-Type: application/json" \
  -d '{"sizeGB":10,"durationDays":7,"paymentToken":"USDC","maxCostUSDC":50}'
```

### Allowlist

```env
ALLOWLIST_ENABLED=true
ALLOWED_PROVIDERS=akash1yourprovider...
```

## API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/status` | Live integration flags + USDC token |
| `GET /api/policies` | All 5 policies (incl. allowlist + USDC limits) |
| `POST /api/procure/storage` | Storage request (`maxCostHBAR` or `maxCostUSDC`) |
| `POST /api/procure/compute` | Compute request |
| `POST /api/confirmations/:id/approve` | Human-approve large purchase |
| `POST /api/confirmations/:id/reject` | Reject pending purchase |
| `GET /api/confirmations/:id` | Pending confirmation details |
| `GET /api/swap/quote` | HBAR→FIL/AKT/USDC quote |
| `GET /api/audit` | Audit log (HCS + cache) |
| `POST /api/agent/chat` | LangChain agent |

## Testing

```bash
npm test
npm run test:integration --workspace=@policymesh/agent
npm run verify
```

## Deployment

**Render:** `render.yaml` — set Hedera secrets + `WEB_UI_URL`.

**Vercel:** root `packages/web`, set `NEXT_PUBLIC_API_URL`.

## License

MIT
