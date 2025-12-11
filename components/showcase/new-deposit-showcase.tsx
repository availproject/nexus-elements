import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import NexusDeposit from "@/registry/nexus-elements/new-deposit/nexus-deposit";

const NewDepositShowcase = () => {
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use Nexus Deposit"
      type="new-deposit"
    >
      <NexusDeposit />
    </ShowcaseWrapper>
  );
};

export default NewDepositShowcase;
