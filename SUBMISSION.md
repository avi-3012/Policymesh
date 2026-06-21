# PolicyMesh — Bounty Submission Checklist

[Hedera AI Agent Bounty Week 5](https://hedera.com) — autonomous procurement for Filecoin storage and Akash compute with Hedera Agent Kit v4 policies and hooks.

## Repository

- **GitHub:** _(add your public repo URL)_
- **Live API:** _(add Render URL)_
- **Live UI:** _(add Vercel URL)_
- **HCS audit topic:** [HashScan testnet](https://hashscan.io/testnet/topic/0.0.9282597)

## What judges should see

1. **5 policies** — Budget (HBAR + USDC), Service Type, Allowlist, Reputation, Delivery Verification (`GET /api/policies`)
2. **3 hooks** — HCS Audit, Price Oracle (CoinGecko), Notifications
3. **Human confirmation** — purchases over 100 HBAR → `POST /api/confirmations/:id/approve`
4. **Live integrations** — `GET /api/status` → `servicesLiveMode: true`
5. **Procurement** — `/procure` UI or `POST /api/procure/storage` / `compute`
6. **USDC quotes** — `GET /api/swap/quote?from=HBAR&to=USDC&amount=100`
7. **LangChain agent** — `/agent` or `POST /api/agent/chat`
8. **Audit trail** — `/audit` + HashScan HCS messages

## Pre-submission checklist

- [ ] `npm test` and `npm run test:integration` pass
- [ ] `npm run verify` with API running
- [ ] `DEMO_MODE=false`, Hedera + `HCS_AUDIT_TOPIC_ID` set
- [ ] `SERVICES_LIVE_MODE=true`
- [ ] Deploy API (Render) + web (Vercel)
- [ ] Demo video: policies → procure → confirmation → HashScan audit
- [ ] Hedera Agent Kit feedback issue (`docs/HEDERA_KIT_FEEDBACK.md`)

## Render env vars (API)

| Variable | Required |
|----------|----------|
| `HEDERA_ACCOUNT_ID` | Yes |
| `HEDERA_PRIVATE_KEY` | Yes |
| `HCS_AUDIT_TOPIC_ID` | Yes |
| `DEMO_MODE` | `false` |
| `SERVICES_LIVE_MODE` | `true` |
| `OPENAI_API_KEY` | For agent |
| `WEB_UI_URL` | Vercel URL |
| `CONFIRMATION_THRESHOLD` | `100` (default) |
| `USDC_TOKEN_ID` | `0.0.429274` |
| `ALLOWLIST_ENABLED` | `true` |
| `FILECOIN_API_KEY`, `AKASH_API_KEY`, `COINGECKO_API_KEY` | Optional |

## Vercel env vars (web)

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_API_URL` | Render API base URL |

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
npm run verify
```
