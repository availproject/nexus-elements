/**
 * Asset paths for the deposit widget.
 * Centralized for easy updates when migrating to nexus-elements registry.
 */
export const DEPOSIT_WIDGET_ASSETS = {
  tokens: {
    USDC: "/usdc.svg",
    ETH: "/ethereum.svg",
  },
  protocols: {
    aave: "/aave.svg",
  },
  wallets: {
    metamask: "/metamask.svg",
    phantom: "/phantom.svg",
  },
  // features now use React icon components instead of SVG files
} as const;
