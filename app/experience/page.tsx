"use client";
import React from "react";
import ExperienceProvider, {
  useExperience,
} from "@/providers/ExperienceProvider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import FastBridge from "@/registry/nexus-elements/fast-bridge/fast-bridge";
import { useAccount } from "wagmi";
import {
  SUPPORTED_CHAINS,
  encodeContractCall,
  TOKEN_CONTRACT_ADDRESSES,
  parseUnits,
  type ExecuteParams,
  EthereumProvider,
} from "@avail-project/nexus-core";
import type { Abi } from "viem";
import SwapExecuteExactOut from "@/registry/nexus-elements/execute/swap-execute-exact-out";
import Swaps from "@/registry/nexus-elements/swaps/swaps";
import { useNexus } from "@/registry/nexus-elements/nexus/NexusProvider";
import { LoaderPinwheel } from "lucide-react";

function Stepper() {
  const { steps, currentIndex, statusById, goTo } = useExperience();
  return (
    <div className="w-full">
      <div className="flex items-center gap-x-4 overflow-x-auto pb-2">
        {steps.map((s, idx) => {
          const status = statusById[s.id];
          const isActive = idx === currentIndex;
          const isClickable = status === "completed" || idx <= currentIndex;
          const baseClass =
            "px-3 py-2 rounded-md border text-sm font-medium transition-colors";
          let stateClass = "border-muted text-muted-foreground";
          if (isActive) {
            stateClass = "border-sky-500 text-sky-600 dark:text-sky-400";
          } else if (status === "completed") {
            stateClass =
              "border-emerald-500 text-emerald-600 dark:text-emerald-400";
          }
          return (
            <Button
              key={s.id}
              variant="outline"
              size="sm"
              onClick={() => isClickable && goTo(idx)}
              className={`${baseClass} ${stateClass}`}
            >
              <span className="mr-2">{idx + 1}.</span>
              {s.title}
            </Button>
          );
        })}
      </div>
      <Separator className="my-3" />
    </div>
  );
}

const executeBuilder = (
  amount: string,
  user: `0x${string}`
): Omit<ExecuteParams, "toChainId"> => {
  const contractAddress = "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as const;
  const abi: Abi = [
    {
      name: "supply",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "asset", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "onBehalfOf", type: "address" },
        { name: "referralCode", type: "uint16" },
      ],
      outputs: [],
    },
  ] as const;
  const decimals = 6; // USDT
  const amountWei = parseUnits(amount, decimals);
  const tokenAddr = TOKEN_CONTRACT_ADDRESSES.USDT[
    SUPPORTED_CHAINS.ARBITRUM
  ] as `0x${string}`;
  const encoded = encodeContractCall({
    contractAbi: abi,
    functionName: "supply",
    functionParams: [tokenAddr, amountWei, user, 0],
  });
  if (!encoded.success || !encoded.data)
    throw new Error("Failed to encode contract call");
  return {
    to: contractAddress,
    data: encoded.data,
    tokenApproval: {
      token: "USDT",
      amount: amountWei,
      spender: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    },
  };
};

function StepContent() {
  const { currentStep, completeCurrent } = useExperience();
  const { address } = useAccount();

  if (currentStep.type === "bridge") {
    if (!address) {
      return (
        <p className="text-sm text-muted-foreground">
          Connect your wallet to start the transfer.
        </p>
      );
    }
    return (
      <FastBridge
        connectedAddress={address}
        onComplete={() => completeCurrent()}
        prefill={{
          token: "USDC",
          chainId: SUPPORTED_CHAINS.BASE,
        }}
      />
    );
  }

  if (currentStep.type === "xcs") {
    return (
      <Swaps
        exactIn={true}
        onComplete={() => completeCurrent()}
        prefill={{
          fromChainID: SUPPORTED_CHAINS.BASE,
          toChainID: SUPPORTED_CHAINS.ARBITRUM,
          fromToken: TOKEN_CONTRACT_ADDRESSES["USDC"][SUPPORTED_CHAINS.BASE],
          toToken: `0x0000000000000000000000000000000000000000`,
        }}
      />
    );
  }
  return (
    <SwapExecuteExactOut
      address={address ?? "0x"}
      executeBuilder={executeBuilder}
    />
  );
}

export default function NexusExperience() {
  const { nexusSDK, handleInit, loading } = useNexus();
  const { connector } = useAccount();
  const nexusInit = async () => {
    try {
      const provider = (await connector?.getProvider()) as EthereumProvider;
      if (!provider) throw new Error("No provider found");
      await handleInit(provider);
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <ExperienceProvider>
      <div className="w-full flex flex-col items-center  gap-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Guided Experience</h2>
            <p className="text-sm text-muted-foreground">
              Bridge → Swap → Swap & Deposit
            </p>
          </div>
        </div>

        <Stepper />
        {nexusSDK?.isInitialized() ? (
          <StepContent />
        ) : (
          <Button onClick={nexusInit}>
            {loading ? (
              <LoaderPinwheel className="animate-spin size-5" />
            ) : (
              "Initialize Nexus"
            )}
          </Button>
        )}
        <FooterNav />
      </div>
    </ExperienceProvider>
  );
}

function FooterNav() {
  const { prev, next, currentIndex, isLastStep } = useExperience();
  return (
    <div className="flex items-center justify-between gap-x-2 p-2 w-full">
      <Button variant="outline" onClick={prev} disabled={currentIndex === 0}>
        Back
      </Button>
      <Button onClick={next}>{isLastStep ? "Done" : "Next"}</Button>
    </div>
  );
}
