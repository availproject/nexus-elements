"use client";
import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import { useAccount } from "wagmi";
import {
  ExecuteParams,
  SUPPORTED_CHAINS,
  TOKEN_CONTRACT_ADDRESSES,
} from "@avail-project/nexus-core";
import { Abi, encodeFunctionData, parseUnits } from "viem";
import SwapDeposit from "@/registry/nexus-elements/swap-deposit/swap-deposit";

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
  const encoded = encodeFunctionData({
    abi: abi,
    functionName: "supply",
    args: [tokenAddr, amountWei, user, 0],
  });
  if (!encoded) throw new Error("Failed to encode contract call");
  return {
    to: contractAddress,
    data: encoded,
    tokenApproval: {
      token: "USDT",
      amount: amountWei,
      spender: contractAddress,
    },
  };
};

const SwapDepositShowcase = () => {
  const { address } = useAccount();
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use Nexus Swap Deposit"
      type="swap-deposit"
    >
      <SwapDeposit address={address ?? "0x"} executeBuilder={executeBuilder} />
    </ShowcaseWrapper>
  );
};

export default SwapDepositShowcase;
