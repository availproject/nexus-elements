---
name: nexus-elements-fast-bridge
description: "DEPRECATED — FastBridge has been removed. Use Nexus One (config.mode = \"swap\") for all cross-chain bridge and swap flows. Refer to the nexus-one-swaps agent skill for current integration guidance."
---

# ⚠️ Deprecated — Use Nexus One Swaps

**FastBridge has been removed from Nexus Elements.**

All cross-chain bridging is now handled by **Nexus One** with `config.mode = "swap"`. Nexus One automatically resolves the best route — including direct bridge paths — based on source and destination token/chain selection.

## Migration

Replace any `FastBridge` usage with `NexusOne`:

```tsx
import { NexusOne } from "@/components/nexus-one/nexus-one";

// Bridge USDC to Base — Nexus One resolves the optimal route automatically
<NexusOne
  config={{
    mode: "swap",
    prefill: {
      source: { token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", chain: 42161 },
      destination: { token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", chain: 8453 },
    },
  }}
  connectedAddress={address}
/>
```

## Install Nexus One

```bash
npx shadcn@latest add @nexus-elements/nexus-one
```

## Recommended skill to use instead

For integration guidance, refer to the **Nexus One Swaps agent skill**:

- `nexus-one-swaps` — Setup, prefill config, and callbacks for swaps and bridging with Nexus One.

## Documentation

- [Nexus One component docs](https://elements.nexus.availproject.org/docs/components/nexus-one)
- [Swap and Bridge docs](https://elements.nexus.availproject.org/docs/components/swaps)
