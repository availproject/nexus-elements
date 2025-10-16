import {
  SUPPORTED_CHAINS,
  SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import React from "react";
import DepositModal from "./components/deposit-modal";
import { Address } from "viem";
import Container from "./components/container";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useNexus } from "../nexus/NexusProvider";

export interface BaseDepositProps {
  address: Address;
  token?: SUPPORTED_TOKENS;
  chain: SUPPORTED_CHAINS_IDS;
  chainOptions?: {
    id: number;
    name: string;
    logo: string;
  }[];
}

interface NexusDepositProps extends BaseDepositProps {
  heading?: string;
  embed?: boolean;
}

const NexusDeposit = ({
  address,
  token = "USDC",
  chain,
  chainOptions,
  heading = "Deposit USDC",
  embed = false,
}: NexusDepositProps) => {
  const { supportedChainsAndTokens } = useNexus();
  const formatedChainOptions =
    chainOptions ??
    supportedChainsAndTokens?.map((chain) => {
      return {
        id: chain.id,
        name: chain.name,
        logo: chain.logo,
      };
    });
  if (embed) {
    return (
      <Card>
        <CardHeader className="px-3">
          <CardTitle>{heading}</CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          <Container
            address={address}
            token={token}
            chain={chain}
            chainOptions={formatedChainOptions}
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <DepositModal
      address={address}
      token={token}
      chain={chain}
      chainOptions={formatedChainOptions}
      heading={heading}
    />
  );
};

export default NexusDeposit;
