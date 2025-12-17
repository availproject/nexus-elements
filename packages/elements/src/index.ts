// Provider
export {
  NexusElementsProvider,
  default as NexusElementsProviderDefault,
} from "./provider/NexusElementsProvider";
export type {
  NexusElementsProviderProps,
  NexusElementsTheme,
} from "./provider/NexusElementsProvider";

// Re-export simple network type for users
export type NexusNetwork = "mainnet" | "testnet";

// Components (also available via subpath exports)
export { default as UnifiedBalance } from "@registry/nexus-elements/unified-balance/unified-balance";
export { default as FastBridge } from "@registry/nexus-elements/fast-bridge/fast-bridge";
export { default as FastTransfer } from "@registry/nexus-elements/transfer/transfer";
export { default as Deposit } from "@registry/nexus-elements/deposit/deposit";
export { default as Swaps } from "@registry/nexus-elements/swaps/swap-widget";
export { default as ViewHistory } from "@registry/nexus-elements/view-history/view-history";

// Hooks (for advanced users)
export { useNexus } from "@registry/nexus-elements/nexus/NexusProvider";
