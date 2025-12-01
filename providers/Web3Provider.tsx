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
  sophon,
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

// Add chain icons for RainbowKit
type ConnectKitChain = Chain & { iconUrl?: string; iconBackground?: string };

const monad = {
  id: 143,
  name: "Monad",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpcs.avail.so/monad"] },
  },
  blockExplorers: {
    default: { name: "MonVision", url: "https://monadvision.com/" },
  },
  testnet: false,
  iconUrl:
    "https://assets.coingecko.com/coins/images/38927/standard/monad.png?1764042736",
};

const hyperEVMWithIcon: ConnectKitChain = {
  ...hyperEVM,
  iconUrl:
    "https://assets.coingecko.com/coins/images/38927/standard/monad.png?1764042736",
};

const WALLET_CONNECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!;

const defaultConfig = getDefaultConfig({
  appName: "Nexus Elements",
  appDescription: "Prebuilt React components powered by Avail Nexus",
  appIcon: "https://elements.nexus.availproject.org/avail-fav.svg",
  walletConnectProjectId: WALLET_CONNECT_ID,
  chains: [
    mainnet,
    base,
    sophon,
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
    monadTestnet,
    monad,
  ],
  enableFamily: false,
});

const wagmiConfig = createConfig(defaultConfig);

function NexusContainer({ children }: Readonly<{ children: React.ReactNode }>) {
  const searchParams = useSearchParams();
  const urlNetwork = (searchParams.get("network") || "mainnet") as NexusNetwork;
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
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ConnectKitProvider theme="minimal">
            <NexusContainer>{children}</NexusContainer>
          </ConnectKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Suspense>
  );
};

export default Web3Provider;
