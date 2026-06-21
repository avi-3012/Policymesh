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

## Live demo — for judges

| Resource | URL |
|----------|-----|
| **Dashboard (start here)** | https://policymesh-blond.vercel.app |
| **API** | https://policymesh.onrender.com |
| **Health check** | https://policymesh.onrender.com/api/health |
| **Status (JSON)** | https://policymesh.onrender.com/api/status |
| **HCS audit topic** | https://hashscan.io/testnet/topic/0.0.9282597 |
| **GitHub** | https://github.com/avi-3012/Policymesh |

**First load note:** The API runs on Render’s free tier. If it has been idle, the first request may take 30–60 seconds while the service wakes up. A [GitHub Actions keep-alive workflow](.github/workflows/keep-alive.yml) pings `/api/health` every 10 minutes to reduce cold starts.

### 1. Confirm the deployment is live

```bash
curl https://policymesh.onrender.com/api/health
curl https://policymesh.onrender.com/api/status
```

Expect `demoMode: false`, `hederaConnected: true`, `servicesLiveMode: true`, and `auditTopicId: 0.0.9282597`.

Or open the dashboard — the header should show **testnet** (not “Demo mode”).

### 2. Dashboard walkthrough (~5 minutes)

1. **Dashboard** — https://policymesh-blond.vercel.app  
   Budget bars, 5 policy indicators, emergency stop.

2. **Policies** — `/policies`  
   View Budget (HBAR + USDC), Allowlist, Reputation, and Delivery rules.

3. **Providers** — `/providers`  
   Live Filecoin Calibration miners and Akash providers (CoinGecko-priced).

4. **Procure** — `/procure`  
   - **Small purchase (auto):** Storage, e.g. 10 GB / 7 days, max cost **≤ 100 HBAR** → policies run → executes without human approval.  
   - **Large purchase (human gate):** Same form with max cost **> 100 HBAR** → status `awaiting_confirmation` → approve on Dashboard or via API below.

5. **Audit** — `/audit`  
   Immutable decision log; open **HashScan** links to verify HCS messages on testnet.

6. **Agent** — `/agent`  
   Example: *“What storage providers are available under our budget?”* (requires OpenAI on the API).

### 3. API smoke tests (optional)

**Policies**

```bash
curl https://policymesh.onrender.com/api/policies
```

**Swap quote (live rates, simulated execution)**

```bash
curl "https://policymesh.onrender.com/api/swap/quote?from=HBAR&to=USDC&amount=100"
```

**Procure storage (auto-execute if ≤ 100 HBAR)**

```bash
curl -X POST https://policymesh.onrender.com/api/procure/storage \
  -H "Content-Type: application/json" \
  -d '{"sizeGB":10,"durationDays":7,"maxCostHBAR":50}'
```

**Procure storage (human confirmation if > 100 HBAR)**

```bash
curl -X POST https://policymesh.onrender.com/api/procure/storage \
  -H "Content-Type: application/json" \
  -d '{"sizeGB":100,"durationDays":30,"maxCostHBAR":150}'
```

Use the `id` from the response:

```bash
curl -X POST https://policymesh.onrender.com/api/confirmations/PASTE_ID/approve \
  -H "Content-Type: application/json" \
  -d '{"approvedBy":"judge"}'
```

**Agent chat**

```bash
curl -X POST https://policymesh.onrender.com/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Summarize our procurement policies"}'
```

### 4. What to verify on HashScan

After a procurement, open the HCS topic on [HashScan](https://hashscan.io/testnet/topic/0.0.9282597). Messages should include policy checks, procurement decisions, and audit events tied to the request.

### 5. Run tests locally (optional)

```bash
npm test
npm run test:integration --workspace=@policymesh/agent
npm run verify   # with API running locally or set API_URL to Render
```

See [Implementation Status](#implementation-status) for what is live vs simulated (HCS audit and policies are real; on-chain HBAR/USDC transfers and SaucerSwap execution are simulated).

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

**Render (API):** `render.yaml` — Hedera secrets, `DEMO_MODE=false`, `WEB_UI_URL=https://policymesh-blond.vercel.app`

**Vercel (UI):** root `packages/web`, `NEXT_PUBLIC_API_URL=https://policymesh.onrender.com`

**Keep-alive:** `.github/workflows/keep-alive.yml` pings `/api/health` every 10 minutes (enable by pushing to `main`; run manually under **Actions → Keep Render warm**).

## License

MIT
