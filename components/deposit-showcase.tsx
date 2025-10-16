"use client";

import NexusDeposit from "@/registry/nexus-elements/deposit/deposit";
import ShowcaseWrapper from "./showcase-wrapper";
import { useAccount } from "wagmi";
import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";

const DepositShowcase = () => {
  const { address } = useAccount();
  return (
    <ShowcaseWrapper heading="Nexus Deposit">
      <NexusDeposit
        address={address ?? `0x`}
        token="USDC"
        tokenOptions={["USDC"]}
        chain={SUPPORTED_CHAINS.ARBITRUM}
        embed={true}
      />
    </ShowcaseWrapper>
  );
};
export default DepositShowcase;
