# PolicyMesh

Autonomous Hedera procurement agent for decentralized infrastructure. PolicyMesh purchases Filecoin storage and Akash compute using HBAR, with strict policy constraints enforced via **Hedera Agent Kit v4 Hooks and Policies**.

Built for [Hedera AI Agent Bounty Week 5](https://hedera.com).

## Architecture

- **Policy Engine** — Four custom policies (`BudgetPolicy`, `ServiceTypePolicy`, `ServiceProviderReputationPolicy`, `DeliveryVerificationPolicy`)
- **Service Layer** — Filecoin, Akash, and SaucerSwap adapters
- **Audit Trail** — HCS-based immutable logging
- **Web UI** — Next.js dashboard for procurement, policies, and audit exploration

## Monorepo Structure

```
policymesh/
├── packages/
│   ├── agent/     # Express + Hedera Agent Kit backend
│   └── web/       # Next.js frontend (Phase 4)
├── README.md
└── render.yaml    # Deployment config (Phase 6)
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp packages/agent/.env.example packages/agent/.env

# Run agent (demo mode works without Hedera credentials)
npm run agent:dev

# Run tests
npm test
```

Health check: `GET http://localhost:3001/api/health`

## Development Phases

| Phase | Target | Scope |
|-------|--------|-------|
| **1** | Thu | Foundation — monorepo, Express, BudgetPolicy, Hedera setup |
| **2** | Thu–Fri | Core policies, AuditHook, policy API, HCS integration |
| **3** | Fri | Filecoin, Akash, SaucerSwap services, DeliveryVerificationPolicy |
| **4** | Sat AM | Next.js frontend — dashboard, wizard, audit explorer |
| **5** | Sat PM | Integration, deployment config, polish |

## Phase 1 ✅

- [x] Monorepo with `packages/agent`
- [x] Express server with health/status/budget endpoints
- [x] `BudgetPolicy` with daily/monthly/per-transaction limits
- [x] Hedera client setup (demo mode when no credentials)
- [x] Unit tests for BudgetPolicy

## Phase 2 ✅

- [x] `ServiceTypePolicy` and `ServiceProviderReputationPolicy`
- [x] `AuditHook` with HCS service (demo + live modes)
- [x] Procurement, policy, audit, and provider REST APIs
- [x] Policy engine with unified evaluation
- [x] Unit tests for service policies

## License

MIT
