"use client";
import "@rainbow-me/rainbowkit/styles.css";
import {
  Chain,
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {
  mainnet,
  scroll,
  polygon,
  optimism,
  arbitrum,
  base,
  avalanche,
  kaia,
  bsc,
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { defineChain } from "viem";

const hyperEVM = defineChain({
  id: 999,
  name: "HyperEVM",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.hyperliquid.xyz/evm"] },
  },
  blockExplorers: {
    default: { name: "HyperEVM Scan", url: "https://hyperevmscan.io" },
  },
});

const sophon = defineChain({
  id: 50104,
  name: "Sophon",
  nativeCurrency: {
    decimals: 18,
    name: "Sophon",
    symbol: "SOPH",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.sophon.xyz"],
      webSocket: ["wss://rpc.sophon.xyz/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Sophon Block Explorer",
      url: "https://explorer.sophon.xyz",
    },
  },
});

// Add chain icons for RainbowKit
type RainbowKitChain = Chain & { iconUrl?: string; iconBackground?: string };

const hyperEVMWithIcon: RainbowKitChain = {
  ...hyperEVM,
  iconUrl:
    "https://assets.coingecko.com/coins/images/50882/standard/hyperliquid.jpg?1729431300",
  iconBackground: "#0a3cff",
};

const sophonWithIcon: RainbowKitChain = {
  ...sophon,
  iconUrl:
    "https://assets.coingecko.com/coins/images/38680/standard/sophon_logo_200.png?1747898236",
  iconBackground: "#6b5cff",
};

const config = getDefaultConfig({
  appName: "Nexus Elements",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID!,
  chains: [
    mainnet,
    base,
    sophonWithIcon,
    hyperEVMWithIcon,
    bsc,
    kaia,
    arbitrum,
    avalanche,
    optimism,
    polygon,
    scroll,
    sepolia,
    baseSepolia,
    arbitrumSepolia,
    optimismSepolia,
    polygonAmoy,
  ],
});

const queryClient = new QueryClient();

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;
