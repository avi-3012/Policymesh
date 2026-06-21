## Feedback for Hedera Agent Kit (Week 5 Bounty)

**Project:** PolicyMesh — autonomous procurement agent for Filecoin/Akash via HBAR

### What we built with Agent Kit v4

- Custom policies extending `AbstractPolicy`: budget limits, service type allowlists, provider reputation, delivery verification
- Custom hooks extending `AbstractHook`: audit trail, price oracle, notifications
- Custom `BaseTool` plugin for procurement (`procure_filecoin_storage`, `procure_akash_compute`, swap tools)
- LangChain integration via `HederaLangchainToolkit` + `createAgent` with hooks in context

### What worked well

- Policy `shouldBlock*` lifecycle hooks integrate cleanly with REST and tool execution
- `HederaLangchainToolkit` makes custom plugins available to LangChain with minimal glue code
- Demo mode allows policy development without live testnet credentials

### Suggestions / friction points

- Document a minimal custom `BaseTool` + `Plugin` example alongside `transfer_hbar` (procurement use case)
- Clarify `AgentMode.RETURN_BYTES` behavior when no operator client is configured
- TypeScript examples for JavaScript ESM consumers importing from `/plugins` and `/hooks` subpaths

### Repository

https://github.com/avi-3012/Policymesh
