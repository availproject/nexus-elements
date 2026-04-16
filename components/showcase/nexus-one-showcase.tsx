"use client";
import React, { useState } from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import { NexusOne } from "@/registry/nexus-elements/nexus-one/nexus-one";
import { type NexusOneMode } from "@/registry/nexus-elements/nexus-one/types";

const ALL_MODES: NexusOneMode[] = ["swap", "deposit", "transfer"];

const NexusOneShowcase = () => {
  const [selectedModes, setSelectedModes] = useState<NexusOneMode[]>(ALL_MODES);

  const toggleMode = (mode: NexusOneMode) => {
    setSelectedModes((prev) => {
      if (prev.includes(mode)) {
        // Prevent removing the last selected mode
        if (prev.length === 1) return prev;
        return prev.filter((m) => m !== mode);
      }
      return [...prev, mode];
    });
  };

  return (
    <div className="flex flex-col gap-y-4 w-full">
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white shadow-sm mb-4">
        <span className="text-sm font-medium text-gray-700">Enabled Modes:</span>
        {ALL_MODES.map((mode) => (
          <label key={mode} className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedModes.includes(mode)}
              onChange={() => toggleMode(mode)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-sm capitalize font-medium text-gray-700">{mode}</span>
          </label>
        ))}
      </div>

      <ShowcaseWrapper
        type="nexus-one"
        connectLabel="Connect wallet to use Nexus One"
      >
        <NexusOne
          key={selectedModes.join(",")}
          config={{
            mode: selectedModes,
            opportunities: [
              {
                id: "aave-arb",
                title: "Aave",
                protocol: "Aave",
                subtitle: "USDT on Aave on Arbitrum",
                logo: "https://files.availproject.org/uploads/2026-04-16/aave.svg",
                chainId: 42161,
                tokenSymbol: "USDT",
                tokenAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                tokenLogo:
                  "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/tokens/usdt/logo.png",
                execute: (amount, connectedAddress) => ({
                  to: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
                  data: "0x", // Mock data for showcase
                  gas: BigInt(300000),
                  tokenApproval: {
                    token: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    amount: amount,
                    spender: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
                  },
                }),
              },
              {
                id: "aave-eth",
                title: "Aave",
                protocol: "Aave",
                subtitle: "GHO on Aave on Ethereum",
                logo: "https://files.availproject.org/uploads/2026-04-16/aave.svg",
                chainId: 1,
                tokenSymbol: "GHO",
                tokenAddress: "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f",
                tokenLogo:
                  "https://s2.coinmarketcap.com/static/img/coins/64x64/23508.png",
                execute: (amount, connectedAddress) => ({
                  to: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
                  data: "0x",
                  gas: BigInt(300000),
                  tokenApproval: {
                    token: "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f",
                    amount: amount,
                    spender: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
                  },
                }),
              },
            ],
          }}
          connectedAddress={"0x0000000000000000000000000000000000000000"}
        />
      </ShowcaseWrapper>
    </div>
  );
};

export default NexusOneShowcase;
