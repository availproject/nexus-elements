"use client";
import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import NexusDeposit from "@/registry/nexus-elements/deposit/nexus-deposit";
import { Abi, Address, encodeFunctionData } from "viem";
import {
  CHAIN_METADATA,
  SUPPORTED_CHAINS,
  TOKEN_CONTRACT_ADDRESSES,
  TOKEN_METADATA,
} from "@avail-project/nexus-core";

const AAVE_POOL_BY_CHAIN: Partial<Record<number, Address>> = {
  [SUPPORTED_CHAINS.BASE]: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  [SUPPORTED_CHAINS.MEGAETH]: "0x7e324abc5de01d112afc03a584966ff199741c28",
};

const DepositShowcase = () => {
  const [embed, setEmbed] = React.useState(false);

  const executeDeposit = (
    tokenSymbol: string,
    tokenAddress: `0x${string}`,
    amount: bigint,
    chainId: number,
    user: Address,
  ) => {
    const contractAddress =
      "0x72f8C254548839Fa1Db4156aE01d8C6ae5885EE4" as const;
    const abi: Abi = [
      {
        inputs: [
          {
            internalType: "uint256",
            name: "assets",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "onBehalf",
            type: "address",
          },
        ],
        name: "deposit",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];

    const encoded = encodeFunctionData({
      abi: abi,
      functionName: "deposit",
      args: [amount, user],
    });
    return {
      to: contractAddress,
      data: encoded,
      gasPriceSelector: "medium",
      tokenApproval: {
        token: tokenAddress,
        amount,
        spender: contractAddress,
      },
    };
  };

  return (
    <ShowcaseWrapper
      type="deposit"
      connectLabel="Connect wallet to use Deposit Widget"
      toggle={true}
      toggleLabel="Embed"
      pressed={embed}
      onPressedChange={setEmbed}
    >
      <NexusDeposit
        embed={embed}
        heading={"Deposit ctUSD on Mystic on Citrea"}
        destination={{
          chainId: SUPPORTED_CHAINS.CITREA,
          tokenAddress: "0x8D82c4E3c936C7B5724A382a9c5a4E6Eb7aB6d5D",
          tokenSymbol: "ctUSD",
          tokenDecimals: 6,
          tokenLogo: "https://files.availproject.org/nexus-elements/ctUSD.svg",
          label: "Deposit ctUSD on Mystic on Citrea",
          gasTokenSymbol:
            CHAIN_METADATA[SUPPORTED_CHAINS.CITREA].nativeCurrency.symbol,
          estimatedTime: "≈ 30s",
          explorerUrl:
            CHAIN_METADATA[SUPPORTED_CHAINS.CITREA].blockExplorerUrls[0],
          depositTargetLogo:
            "https://files.availproject.org/nexus-elements/mystic.png",
        }}
        executeDeposit={executeDeposit}
      />
    </ShowcaseWrapper>
  );
};

export default DepositShowcase;
