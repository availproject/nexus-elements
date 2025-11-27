"use client";
import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import SwapDeposit from "@/registry/nexus-elements/swap-deposit/swap-deposit";
import { Abi, encodeFunctionData } from "viem";
import {
  CHAIN_METADATA,
  SUPPORTED_CHAINS,
  TOKEN_CONTRACT_ADDRESSES,
  TOKEN_METADATA,
} from "@avail-project/nexus-core";

{
  /* <SwapDeposit
destination={{
  chainId: SUPPORTED_CHAINS.BASE,
  tokenAddress:
    TOKEN_CONTRACT_ADDRESSES["USDC"][SUPPORTED_CHAINS.BASE],
  tokenSymbol: "USDC",
  tokenDecimals: TOKEN_METADATA["USDC"].decimals,
  tokenLogo: TOKEN_METADATA["USDC"].icon,
  label: "Deposit USDC on Aave Base",
  gasTokenSymbol:
    CHAIN_METADATA[SUPPORTED_CHAINS.BASE].nativeCurrency.symbol,
  estimatedTime: "≈ 30s",
}}
executeDeposit={(
  tokenSymbol,
  tokenAddress,
  amount,
  _chainId,
  user
) => {
  const contractAddress =
    "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" as const;
  const abi: Abi = [
    {
      inputs: [
        {
          internalType: "address",
          name: "asset",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "onBehalfOf",
          type: "address",
        },
        {
          internalType: "uint16",
          name: "referralCode",
          type: "uint16",
        },
      ],
      name: "supply",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];
  if (tokenSymbol === "ETH") {
    throw new Error(
      "ETH is native and not supported for this execute builder"
    );
  }
  const encoded = encodeFunctionData({
    abi: abi,
    functionName: "supply",
    args: [tokenAddress, amount, user, 0],
  });
  if (!encoded) {
    throw new Error("Failed to encode contract call");
  }
  return {
    to: contractAddress,
    data: encoded,
    tokenApproval: {
      token: tokenSymbol,
      amount: amount,
      spender: contractAddress,
    },
  };
}}
/> */
}

const SwapDepositShowcase = () => {
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use Nexus Swap Deposit"
      type="swap-deposit"
    >
      <SwapDeposit
        destination={{
          chainId: SUPPORTED_CHAINS.ARBITRUM,
          tokenAddress:
            TOKEN_CONTRACT_ADDRESSES["USDT"][SUPPORTED_CHAINS.ARBITRUM],
          tokenSymbol: "USDT",
          tokenDecimals: TOKEN_METADATA["USDT"].decimals,
          tokenLogo: TOKEN_METADATA["USDT"].icon,
          label: "Deposit USDT on Arbitrum",
          gasTokenSymbol:
            CHAIN_METADATA[SUPPORTED_CHAINS.ARBITRUM].nativeCurrency.symbol,
          estimatedTime: "≈ 30s",
        }}
        executeDeposit={(tokenSymbol, tokenAddress, amount, _chainId, user) => {
          const contractAddress =
            "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as const;
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
          ];
          if (tokenSymbol === "ETH") {
            throw new Error(
              "ETH is native and not supported for this execute builder"
            );
          }
          const encoded = encodeFunctionData({
            abi: abi,
            functionName: "supply",
            args: [tokenAddress, amount, user, 0],
          });
          if (!encoded) {
            throw new Error("Failed to encode contract call");
          }
          return {
            to: contractAddress,
            data: encoded,
            tokenApproval: {
              token: tokenSymbol,
              amount: amount,
              spender: contractAddress,
            },
          };
        }}
      />
    </ShowcaseWrapper>
  );
};

export default SwapDepositShowcase;
