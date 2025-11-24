import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import SwapDeposit from "@/registry/nexus-elements/swap-deposit/swap-deposit";
import { Abi, encodeFunctionData } from "viem";

const SwapDepositShowcase = () => {
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use Nexus Swap Deposit"
      type="swap-deposit"
    >
      <SwapDeposit
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
