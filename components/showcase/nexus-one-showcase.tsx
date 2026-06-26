"use client";
import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import { NexusWidget } from "@/registry/nexus-elements/nexus-one/nexus-one";
import { useAccount } from "wagmi";
import { useConnectWalletClick } from "../helpers/use-connect-wallet-click";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

const NexusWidgetShowcase = () => {
  const { address } = useAccount();
  const openConnectWallet = useConnectWalletClick();

  return (
    <ShowcaseWrapper
      type="nexus-one"
      connectLabel="Connect wallet to use Swap and Bridge"
    >
      <div
        className="flex w-full justify-center"
        style={{
          alignItems: "flex-start",
        }}
      >
        <NexusWidget
          config={{
            mode: "swap",
            destination: {
              chain: 8453,
              tokens: [
                {
                  address: USDC_BASE,
                  decimals: 6,
                  symbol: "USDC",
                },
              ],
            },
          }}
          connectedAddress={address}
          onConnectClick={openConnectWallet}
        />
      </div>
    </ShowcaseWrapper>
  );
};

export default NexusWidgetShowcase;
