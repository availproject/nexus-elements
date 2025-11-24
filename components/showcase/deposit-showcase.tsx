"use client";
import ShowcaseWrapper from "./showcase-wrapper";
import { useAccount } from "wagmi";
import {
  SUPPORTED_CHAINS,
  TOKEN_CONTRACT_ADDRESSES,
} from "@avail-project/nexus-core";
import { encodeFunctionData, parseUnits, type Abi } from "viem";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Skeleton } from "@/registry/nexus-elements/ui/skeleton";
const NexusDeposit = dynamic(
  () => import("@/registry/nexus-elements/deposit/deposit"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full" />,
  }
);

const DepositShowcase = () => {
  const { address } = useAccount();
  const [viewAs, setViewAs] = useState<boolean>(true);
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use Nexus Deposit"
      type="deposit"
      toggle={true}
      toggleLabel="View as Modal"
      pressed={viewAs}
      onPressedChange={(value) => setViewAs(value)}
    >
      <NexusDeposit
        address={address ?? `0x`}
        token="USDT"
        chain={SUPPORTED_CHAINS.ARBITRUM}
        embed={viewAs}
        destinationLabel="on Aave v3"
        heading="Deposit USDT"
        depositExecute={(token, amount, _chainId, user) => {
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
          const amountWei = parseUnits(amount, 6);
          if (token === "ETH") {
            throw new Error(
              "ETH is native and not supported for this execute builder"
            );
          }
          const chainMap = TOKEN_CONTRACT_ADDRESSES[token];
          if (!(_chainId in chainMap)) {
            throw new Error("Selected chain is not supported for this token");
          }
          const tokenAddr = chainMap[_chainId as keyof typeof chainMap];
          const encoded = encodeFunctionData({
            abi: abi,
            functionName: "supply",
            args: [tokenAddr, amountWei, user, 0],
          });
          if (!encoded) {
            throw new Error("Failed to encode contract call");
          }
          return {
            to: contractAddress,
            data: encoded,
            tokenApproval: {
              token,
              amount: amountWei,
              spender: contractAddress,
            },
          };
        }}
      />
    </ShowcaseWrapper>
  );
};
export default DepositShowcase;
