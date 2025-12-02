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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/nexus-elements/ui/tabs";
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
      connectLabel="Connect wallet to use Nexus Deposit"
      type="deposit"
      toggle={true}
      toggleLabel="Embed"
      pressed={viewAs}
      onPressedChange={(value) => setViewAs(value)}
    >
      <Tabs defaultValue="base">
        <TabsList>
          <TabsTrigger value="base">Deposit USDC on AAVE Base</TabsTrigger>
          <TabsTrigger value="ethereum">
            Deposit USDC on AAVE Ethereum
          </TabsTrigger>
        </TabsList>
        <TabsContent value="base">
          <NexusDeposit
            address={address ?? `0x`}
            token="USDC"
            chain={SUPPORTED_CHAINS.BASE}
            embed={viewAs}
            destinationLabel="on Aave v3"
            heading="Deposit USDC on Aave"
            depositExecute={(token, amount, _chainId, user) => {
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
              const amountWei = parseUnits(amount, 6);
              if (token === "ETH") {
                throw new Error(
                  "ETH is native and not supported for this execute builder"
                );
              }
              const chainMap = TOKEN_CONTRACT_ADDRESSES[token];
              if (!(_chainId in chainMap)) {
                throw new Error(
                  "Selected chain is not supported for this token"
                );
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
        </TabsContent>
        <TabsContent value="ethereum">
          <NexusDeposit
            address={address ?? `0x`}
            token="USDC"
            chain={SUPPORTED_CHAINS.ETHEREUM}
            embed={true}
            destinationLabel="on Aave v3"
            heading="Deposit USDC on Aave ETH"
            depositExecute={(token, amount, _chainId, user) => {
              const contractAddress =
                "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" as const;
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
              const amountWei = parseUnits(amount, 6);
              if (token === "ETH") {
                throw new Error(
                  "ETH is native and not supported for this execute builder"
                );
              }
              const chainMap = TOKEN_CONTRACT_ADDRESSES[token];
              if (!(_chainId in chainMap)) {
                throw new Error(
                  "Selected chain is not supported for this token"
                );
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
        </TabsContent>
      </Tabs>
    </ShowcaseWrapper>
  );
};
export default DepositShowcase;
