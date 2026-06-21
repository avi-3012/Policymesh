# PolicyMesh credentials & environment reference

Paste values into **`packages/agent/.env`** (gitignored). Template: **`packages/agent/.env.example`**.

Web dashboard: **`packages/web/.env.local`** with `NEXT_PUBLIC_API_URL=http://localhost:3001`.

---

## Quick start

```bash
cp packages/agent/.env.example packages/agent/.env   # then edit
cp packages/web/.env.example packages/web/.env.local
npm run setup:hcs    # creates HCS topic, updates .env
npm run agent:dev    # API :3001
npm run web          # UI :3000
npm run verify       # smoke test
```

---

## DEMO_MODE vs live

| | `DEMO_MODE=true` | `DEMO_MODE=false` |
|---|------------------|-------------------|
| Hedera client | Off | Testnet |
| HCS audit | In-memory | On-chain topic |
| Filecoin / Akash / rates | Simulated | Live when `SERVICES_LIVE_MODE=true` |
| Policies | Enforced | Enforced |

Set `DEMO_MODE=false` when `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, and `HCS_AUDIT_TOPIC_ID` are set.

---

## Required variables

| Variable | Purpose | How to get |
|----------|---------|------------|
| `HEDERA_ACCOUNT_ID` | Testnet operator | [portal.hedera.com](https://portal.hedera.com) |
| `HEDERA_PRIVATE_KEY` | Signs HCS messages | Export at account creation (ECDSA `0x...`) |
| `HCS_AUDIT_TOPIC_ID` | Immutable audit log | `npm run setup:hcs` |
| `OPENAI_API_KEY` | Agent chat (optional) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

---

## Live integrations (optional keys)

| Variable | Default | Notes |
|----------|---------|-------|
| `SERVICES_LIVE_MODE` | `true` | Set `false` to simulate Filecoin/Akash/rates |
| `FILECOIN_RPC_URL` | Glif Calibration | Optional `FILECOIN_API_KEY` |
| `AKASH_CONSOLE_API_URL` | `https://console-api.akash.network` | Use `/v1/providers` path; base URL 404 is normal |
| `AKASH_API_KEY` | empty | Public provider list needs no key |
| `COINGECKO_API_KEY` | empty | Optional rate-limit boost |
| `SAUCERSWAP_RPC_URL` | Hashio testnet | Router/quoter IDs preconfigured |

---

## Policy & procurement variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MAX_PER_PROCUREMENT` | 500 | HBAR cap per order |
| `MAX_DAILY_SPEND` | 2000 | HBAR daily budget |
| `MAX_MONTHLY_SPEND` | 20000 | HBAR rolling 30-day budget |
| `MIN_PROCUREMENT_AMOUNT` | 10 | Minimum HBAR order |
| `USDC_TOKEN_ID` | `0.0.429274` | Hedera testnet USDC |
| `MAX_USDC_PER_PROCUREMENT` | 100 | USDC cap per order |
| `MIN_USDC_PER_PROCUREMENT` | 1 | Minimum USDC order |
| `ALLOWLIST_ENABLED` | `true` | Provider whitelist on/off |
| `ALLOWED_PROVIDER_1/2/3` | empty | Extra allowed providers |
| `ALLOWED_PROVIDERS` | empty | Comma-separated provider IDs |
| `CONFIRMATION_THRESHOLD` | 100 | Above this → human approval required |
| `APPROVER_SIGNATURE_THRESHOLD` | 300 | High-value signature on approve |
| `MIN_REPUTATION_SCORE` | 0.75 | Provider reputation floor |

Default seed allowlist: `f01234`, `f05678`, `akash-provider-1`, `akash-gpu-1`.

---

## Production deployment

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | https://policymesh.onrender.com |
| `WEB_UI_URL` | https://policymesh-blond.vercel.app |

See [SUBMISSION.md](./SUBMISSION.md) and [render.yaml](./render.yaml).

---

## Verify

```bash
curl http://localhost:3001/api/status | jq '.servicesLiveMode, .integrations'
curl http://localhost:3001/api/policies | jq 'keys'
curl "http://localhost:3001/api/swap/quote?from=HBAR&to=USDC&amount=100"
```

HashScan audit topic: `https://hashscan.io/testnet/topic/<HCS_AUDIT_TOPIC_ID>`
