"use client";
import { createConfig, WagmiProvider } from "wagmi";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
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
  monadTestnet,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Chain, defineChain } from "viem";
import NexusProvider from "@/registry/nexus-elements/nexus/NexusProvider";
import { useSearchParams } from "next/navigation";
import { type NexusNetwork } from "@avail-project/nexus-core";
import { Suspense, useMemo } from "react";
import { Skeleton } from "@/registry/nexus-elements/ui/skeleton";

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
type ConnectKitChain = Chain & { iconUrl?: string; iconBackground?: string };

const hyperEVMWithIcon: ConnectKitChain = {
  ...hyperEVM,
  iconUrl:
    "https://assets.coingecko.com/coins/images/50882/standard/hyperliquid.jpg?1729431300",
  iconBackground: "#0a3cff",
};

const sophonWithIcon: ConnectKitChain = {
  ...sophon,
  iconUrl:
    "https://assets.coingecko.com/coins/images/38680/standard/sophon_logo_200.png?1747898236",
  iconBackground: "#6b5cff",
};

const config = createConfig(
  getDefaultConfig({
    appName: "Nexus Elements",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
    chains: [
      mainnet,
      base,
      sophon,
      hyperEVM,
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
      monadTestnet,
    ],
  })
);

function NexusContainer({ children }: Readonly<{ children: React.ReactNode }>) {
  const searchParams = useSearchParams();
  const urlNetwork = (searchParams.get("network") || "canary") as NexusNetwork;
  const nexusConfig = useMemo(
    () => ({ network: urlNetwork, debug: true }),
    [urlNetwork]
  );
  return <NexusProvider config={nexusConfig}>{children}</NexusProvider>;
}

const Web3Provider = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <Suspense fallback={<Skeleton className="w-full h-full" />}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ConnectKitProvider>
            <NexusContainer>{children}</NexusContainer>
          </ConnectKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Suspense>
  );
};

export default Web3Provider;
