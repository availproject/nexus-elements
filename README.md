# Nexus Elements

## Install Fast Bridge (shadcn)

You can install the `fast-bridge` component into any project using the shadcn CLI via a direct URL.

### Direct registry (zero setup)

```bash
pnpm dlx shadcn@latest add @nexus-elements/fast-bridge
```

### Local development (install from localhost)

If you’re running this repo locally:

1. Start the dev server in this repo:

```bash
pnpm dev
```

2. Install via direct URL:

```bash
pnpm dlx shadcn@latest add http://localhost:3000/r/fast-bridge.json
```

## Notes

- The CLI will install the necessary UI primitives and utilities listed as `registryDependencies`.
- If you prefer npm or yarn, replace the `pnpm dlx` with `npx` for example, command with the equivalent for your package manager.

## Skills (skills.sh)

Install all Nexus Elements skills:
```bash
npx skills add availproject/nexus-elements
```

Install a single skill:
```bash
npx skills add https://github.com/availproject/nexus-elements --skill nexus-elements-deposit
```

Available skills:
- nexus-elements-overview
- nexus-elements-nexus-provider
- nexus-elements-fast-bridge
- nexus-elements-transfer
- nexus-elements-deposit
- nexus-elements-bridge-deposit
- nexus-elements-swaps
- nexus-elements-unified-balance
- nexus-elements-view-history
- nexus-elements-common

## API updates (performance-focused, no new deps)

- Swaps (`Swaps`, `SwapExactIn`, `SwapExactOut`) and Fast Bridge now support:
  - `onStart?(): void` — called when a transaction begins.
  - `onError?(message: string): void` — called when a transaction fails.
  - `onComplete?(amount?: string): void` — called on success (existing).
- Internals now use reusable hooks to minimize `useEffect` and `useState`:
  - `useStopwatch`, `useInterval`, `usePolling`, `useDebounced*`, and a shared `useTransactionSteps`.
- Behavior is unchanged; no external packages were added.

## References

- shadcn Registry Getting Started: https://ui.shadcn.com/docs/registry/getting-started.md
- Item schema: https://ui.shadcn.com/docs/registry/registry-item-json.md
