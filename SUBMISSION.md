# PolicyMesh — Bounty Submission Checklist

[Hedera AI Agent Bounty Week 5](https://hedera.com) — autonomous procurement for Filecoin storage and Akash compute with Hedera Agent Kit v4 policies and hooks.

## Repository

- **GitHub:** https://github.com/avi-3012/Policymesh
- **Live API:** https://policymesh.onrender.com
- **Live UI:** https://policymesh-blond.vercel.app
- **HCS audit topic:** https://hashscan.io/testnet/topic/0.0.9282597

## What judges should see

1. **5 policies** — Budget (HBAR + USDC), Service Type, Allowlist, Reputation, Delivery Verification (`GET /api/policies`)
2. **3 hooks** — HCS Audit, Price Oracle (CoinGecko), Notifications
3. **Human confirmation** — purchases over 100 HBAR → `POST /api/confirmations/:id/approve`
4. **Live integrations** — `GET /api/status` → `servicesLiveMode: true`
5. **Procurement** — `/procure` UI or `POST /api/procure/storage` / `compute`
6. **USDC quotes** — `GET /api/swap/quote?from=HBAR&to=USDC&amount=100`
7. **LangChain agent** — `/agent` or `POST /api/agent/chat`
8. **Audit trail** — `/audit` + HashScan HCS messages

Full judge walkthrough: [README.md — Live demo](./README.md#live-demo--for-judges)

## Pre-submission checklist

- [x] `npm test` passes (38 unit tests)
- [ ] `npm run test:integration` pass (slow; Hedera HCS calls)
- [x] `npm run verify` against live API (`API_URL=https://policymesh.onrender.com`)
- [x] `DEMO_MODE=false`, Hedera + `HCS_AUDIT_TOPIC_ID` set on Render
- [x] `SERVICES_LIVE_MODE=true`
- [x] Deploy API (Render) + web (Vercel)
- [x] `WEB_UI_URL` → https://policymesh-blond.vercel.app
- [x] `NEXT_PUBLIC_API_URL` → https://policymesh.onrender.com
- [ ] **OpenAI billing** — agent chat returned 429 quota on production (fix before demo video)
- [ ] Demo video: policies → procure → confirmation → HashScan audit
- [ ] Hedera Agent Kit feedback issue filed (`docs/HEDERA_KIT_FEEDBACK.md`)
- [ ] Push latest README + keep-alive workflow to `main`
- [ ] Submit on bounty portal

## Render env vars (API)

| Variable | Required |
|----------|----------|
| `HEDERA_ACCOUNT_ID` | Yes |
| `HEDERA_PRIVATE_KEY` | Yes |
| `HCS_AUDIT_TOPIC_ID` | Yes (`0.0.9282597`) |
| `DEMO_MODE` | `false` |
| `SERVICES_LIVE_MODE` | `true` |
| `OPENAI_API_KEY` | For agent (needs active billing) |
| `WEB_UI_URL` | https://policymesh-blond.vercel.app |
| `CONFIRMATION_THRESHOLD` | `100` (default) |
| `USDC_TOKEN_ID` | `0.0.429274` |
| `ALLOWLIST_ENABLED` | `true` |
| `FILECOIN_API_KEY`, `AKASH_API_KEY`, `COINGECKO_API_KEY` | Optional |

## Vercel env vars (web)

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_API_URL` | https://policymesh.onrender.com |

## Implementation honesty (see README)

| Live today | Simulated / pending |
|------------|---------------------|
| Policies, HCS audit, CoinGecko rates | On-chain HBAR transfers |
| Filecoin/Akash provider APIs | Full Filecoin deals / Akash leases on-chain |
| HBAR→FIL/AKT/USDC **quotes** | SaucerSwap / HTS **execution** |

## Commands

```bash
npm install
npm run setup:hcs
npm run agent:dev
npm run web
npm test
npm run test:integration
API_URL=https://policymesh.onrender.com npm run verify
```
