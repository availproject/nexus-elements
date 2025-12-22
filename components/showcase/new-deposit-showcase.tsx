import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import NexusDeposit from "@/registry/nexus-elements/new-deposit/nexus-deposit";

const NewDepositShowcase = () => {
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use New Deposit Widget"
    >
      <NexusDeposit />
    </ShowcaseWrapper>
  );
};

export default NewDepositShowcase;
