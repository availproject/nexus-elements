# @avail-project/nexus-elements

React components for Avail Nexus - drop-in UI components for cross-chain bridging, transfers, deposits, and swaps.

## Installation

```bash
npm install @avail-project/nexus-elements
# or
pnpm add @avail-project/nexus-elements
# or
yarn add @avail-project/nexus-elements
```

## Peer Dependencies

This package requires React 18 or 19:

```bash
npm install react react-dom
```

## Usage

### 1. Import styles (once, at app level)

```tsx
// app/layout.tsx or _app.tsx or main.tsx
import "@avail-project/nexus-elements/styles.css"
```

### 2. Wrap your app with the provider

```tsx
import { NexusElementsProvider } from "@avail-project/nexus-elements"

function App() {
  return (
    <NexusElementsProvider network="mainnet">
      {/* Your app */}
    </NexusElementsProvider>
  )
}
```

### 3. Use components

```tsx
import { UnifiedBalance, FastBridge, Deposit } from "@avail-project/nexus-elements"

// Or import from subpaths for smaller bundles
import { UnifiedBalance } from "@avail-project/nexus-elements/unified-balance"
import { FastBridge } from "@avail-project/nexus-elements/fast-bridge"
```

## Components

| Component | Description | Import Path |
|-----------|-------------|-------------|
| `UnifiedBalance` | Display unified balance across chains | `/unified-balance` |
| `FastBridge` | Cross-chain bridging | `/fast-bridge` |
| `FastTransfer` | Cross-chain transfers | `/fast-transfer` |
| `Deposit` | Deposit funds | `/deposit` |
| `Swaps` | Token swaps | `/swaps` |
| `ViewHistory` | Transaction history | `/view-history` |

## Customization

Pass a `theme` object to customize CSS variables:

```tsx
<NexusElementsProvider
  network="mainnet"
  theme={{
    '--nexus-primary': '220 90% 56%',
    '--nexus-radius': '0.75rem',
    '--nexus-background': '0 0% 100%',
  }}
>
  {/* Components will use your custom theme */}
</NexusElementsProvider>
```

### Available CSS Variables

| Variable | Description |
|----------|-------------|
| `--nexus-background` | Background color (HSL values) |
| `--nexus-foreground` | Text color |
| `--nexus-primary` | Primary accent color |
| `--nexus-primary-foreground` | Text on primary |
| `--nexus-secondary` | Secondary color |
| `--nexus-muted` | Muted backgrounds |
| `--nexus-muted-foreground` | Muted text |
| `--nexus-border` | Border color |
| `--nexus-radius` | Border radius |

## Hooks

For advanced use cases, you can access the Nexus SDK context:

```tsx
import { useNexus } from "@avail-project/nexus-elements"

function MyComponent() {
  const { nexusSDK, bridgableBalance, loading } = useNexus()
  // ...
}
```

## Requirements

- React 18.0.0+ or React 19.0.0+
- A Web3 provider (wagmi, ethers, etc.) for wallet connectivity

## License

MIT
