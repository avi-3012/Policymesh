# PolicyMesh

Autonomous Hedera procurement agent for decentralized infrastructure. PolicyMesh purchases **Filecoin storage** and **Akash compute** using HBAR, with strict policy constraints enforced via **Hedera Agent Kit v4 Hooks and Policies**.

Built for [Hedera AI Agent Bounty Week 5](https://hedera.com).

## Features

- **4 enforcement policies** — Budget, Service Type, Provider Reputation, Delivery Verification
- **3 observability hooks** — Audit (HCS), Price Oracle, Notifications
- **HBAR payments** — SaucerSwap + CoinGecko live rates for HBAR → FIL / AKT swaps
- **Live integrations** — Filecoin Calibration (Glif RPC), Akash Console API, SaucerSwap oracle
- **LangChain agent** — GPT-4o-mini with custom `BaseTool` procurement tools
- **Web dashboard** — procurement wizard, policy editor, audit explorer, provider directory

## Architecture

```
packages/
├── agent/   Express API + Hedera Agent Kit policies/hooks + LangChain agent
└── web/     Next.js dashboard
```

## Quick start

```bash
npm install

# API (port 3001)
cp packages/agent/.env.example packages/agent/.env
npm run agent:dev

# Dashboard (port 3000)
cp packages/web/.env.example packages/web/.env.local
npm run web
```

Open **http://localhost:3000** for the dashboard. The API runs at **http://localhost:3001**.

### Demo mode

Without Hedera credentials, the agent runs in demo mode: policies, simulated Filecoin/Akash/SaucerSwap, and in-memory HCS audit. Set `DEMO_MODE=false` and add testnet credentials for live Hedera + external APIs.

### Live service integrations

When `DEMO_MODE=false` and `SERVICES_LIVE_MODE=true` (default):

| Service | Source | Env vars |
|---------|--------|----------|
| Filecoin | Glif Calibration RPC | `FILECOIN_RPC_URL`, optional `FILECOIN_API_KEY` |
| Akash | Console API providers | `AKASH_CONSOLE_API_URL`, optional `AKASH_API_KEY` |
| SaucerSwap | CoinGecko + Hedera router | `SAUCERSWAP_RPC_URL`, optional `COINGECKO_API_KEY` |

Check `GET /api/status` for `servicesLiveMode` and integration details. See [CREDENTIALS.md](./CREDENTIALS.md) and [SUBMISSION.md](./SUBMISSION.md).

### AI agent

Set `OPENAI_API_KEY` in `packages/agent/.env` to enable `POST /api/agent/chat` and the **Agent** page in the UI.

## API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/status` | Agent status + live integration flags |
| `POST /api/procure/storage` | Storage procurement request |
| `POST /api/procure/compute` | Compute procurement request |
| `POST /api/procurements/:id/confirm` | Execute confirmed procurement |
| `GET /api/policies` | Policy configuration |
| `GET /api/audit` | Audit log (HCS + cache) |
| `POST /api/agent/chat` | LangChain procurement agent |

## Testing

```bash
npm test                              # Unit tests
npm run test:integration --workspace=@policymesh/agent
```

## Deployment

**Backend (Render):** import repo, use `render.yaml`. Set Hedera credentials and `WEB_UI_URL` in the dashboard.

**Frontend (Vercel):** set **Root Directory** to `packages/web`, add `NEXT_PUBLIC_API_URL` pointing to your Render API. Update the API proxy URL in `packages/web/vercel.json` if your Render service name differs.

Keep the API alive with UptimeRobot pinging `/api/health` every 10 minutes on Render free tier.

Full checklist: [SUBMISSION.md](./SUBMISSION.md)

## Hedera testnet setup

1. Create account at [portal.hedera.com](https://portal.hedera.com)
2. Fund via [testnet faucet](https://portal.hedera.com/faucet)
3. Create HCS audit topic, set `HCS_AUDIT_TOPIC_ID`
4. Verify audit messages on [HashScan testnet](https://hashscan.io/testnet)

## License

MIT
