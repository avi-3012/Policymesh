# PolicyMesh — Bounty Submission Checklist

[Hedera AI Agent Bounty Week 5](https://hedera.com) — autonomous procurement for Filecoin storage and Akash compute with Hedera Agent Kit v4 policies and hooks.

## Repository

- **GitHub:** _(add your public repo URL)_
- **Live API:** _(add Render URL, e.g. `https://policymesh-agent.onrender.com`)_
- **Live UI:** _(add Vercel URL)_
- **HCS audit topic:** [HashScan testnet topic](https://hashscan.io/testnet/topic/0.0.9282597) _(update if different)_

## What judges should see

1. **Policies** — Budget, Service Type, Provider Reputation, Delivery Verification (`GET /api/policies`)
2. **Hooks** — HCS Audit, Price Oracle (CoinGecko + SaucerSwap), Notifications
3. **Live integrations** — `GET /api/status` shows `servicesLiveMode: true` when deployed with Hedera credentials
4. **Procurement** — Dashboard at `/procure` or `POST /api/procure/storage` / `POST /api/procure/compute`
5. **LangChain agent** — `/agent` page or `POST /api/agent/chat`
6. **Audit trail** — `/audit` page + on-chain HCS messages when not in demo mode

## Pre-submission checklist

- [ ] `npm test` — all unit tests pass
- [ ] `npm run test:integration` — API integration tests pass
- [ ] `npm run verify` — smoke test against running API
- [ ] `DEMO_MODE=false` with Hedera testnet account + `HCS_AUDIT_TOPIC_ID`
- [ ] `SERVICES_LIVE_MODE=true` (default when not in demo mode)
- [ ] Deploy API to Render (`render.yaml`)
- [ ] Deploy web to Vercel (`vercel.json`, set `NEXT_PUBLIC_API_URL`)
- [ ] Record demo video (2–5 min): policies → procure → audit on HashScan → agent chat
- [ ] Submit feedback issue to [hedera-agent-kit-js](https://github.com/hashgraph/hedera-agent-kit-js) using `docs/HEDERA_KIT_FEEDBACK.md`

## Environment variables (production)

### Render (API) — `packages/agent`

| Variable | Required |
|----------|----------|
| `HEDERA_ACCOUNT_ID` | Yes (live) |
| `HEDERA_PRIVATE_KEY` | Yes (live) |
| `HCS_AUDIT_TOPIC_ID` | Yes (live audit) |
| `DEMO_MODE` | `false` for bounty |
| `SERVICES_LIVE_MODE` | `true` |
| `OPENAI_API_KEY` | For agent chat |
| `WEB_UI_URL` | Vercel dashboard URL |
| `FILECOIN_API_KEY` | Optional |
| `AKASH_API_KEY` | Optional |
| `COINGECKO_API_KEY` | Optional (rate limits) |

### Vercel (web) — `packages/web`

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_API_URL` | Render API base URL |

## Architecture summary

```
User → Next.js UI → Express API → Policy Engine
                              → Filecoin (Glif Calibration RPC)
                              → Akash (Console API)
                              → SaucerSwap / CoinGecko (rates)
                              → HCS Audit Topic
                              → LangChain + Hedera Agent Kit
```

## Notes for reviewers

- **Filecoin deals** and **Akash deployments** use live provider discovery; deal sealing and lease creation are tracked locally (full on-chain deals require Lotus wallet / Akash cert deployment).
- **SaucerSwap swaps** return live market quotes; on-chain swap execution requires WHBAR and token association on the operator account.
- **Demo mode** (`DEMO_MODE=true`) disables Hedera and all live external APIs — useful for CI and offline development.

## Commands

```bash
npm install
npm run setup:hcs          # one-time HCS topic
npm run agent:dev          # API :3001
npm run web                # UI :3000
npm test
npm run test:integration
npm run verify
```
