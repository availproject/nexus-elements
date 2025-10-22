"use client";
import ShowcaseWrapper from "./showcase-wrapper";
import { useAccount } from "wagmi";
import {
  SUPPORTED_CHAINS,
  TOKEN_CONTRACT_ADDRESSES,
  TOKEN_METADATA,
} from "@avail-project/nexus-core";
import { parseUnits } from "viem";
import dynamic from "next/dynamic";
import { Skeleton } from "../ui/skeleton";
import { useState } from "react";
import { Toggle } from "../ui/toggle";
import { Check, X } from "lucide-react";
const NexusDeposit = dynamic(
  () => import("@/registry/nexus-elements/deposit/deposit"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full" />,
  }
);

const DepositShowcase = () => {
  const { address } = useAccount();
  const [viewAs, setViewAs] = useState<boolean>(false);
  return (
    <ShowcaseWrapper
      heading="Nexus Deposit"
      connectLabel="Connect wallet to use Nexus Deposit"
      registryItemName="deposit"
    >
      <Toggle
        variant={"outline"}
        size="sm"
        pressed={viewAs}
        onPressedChange={(value) => setViewAs(value)}
        className="absolute top-0 left-2 cursor-pointer"
      >
        <p className="text-sm font-medium">Embedded</p>
        {viewAs ? <Check className="size-4" /> : <X className="size-4" />}
      </Toggle>
      <NexusDeposit
        address={address ?? `0x`}
        token="USDC"
        chain={SUPPORTED_CHAINS.BASE}
        embed={viewAs}
        destinationLabel="on Aave v3"
        depositExecute={{
          contractAddress: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
          contractAbi: [
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
          ] as const,
          functionName: "supply",
          buildFunctionParams: (token, amount, _chainId, user) => {
            const decimals = TOKEN_METADATA[token].decimals;
            const amountWei = parseUnits(amount, decimals);
            const tokenAddr = TOKEN_CONTRACT_ADDRESSES[token][_chainId];
            return { functionParams: [tokenAddr, amountWei, user, 0] };
          },
        }}
      />
    </ShowcaseWrapper>
  );
};
export default DepositShowcase;
