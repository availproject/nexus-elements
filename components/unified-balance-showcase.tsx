"use client";
import * as React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import UnifiedBalance from "@/registry/nexus-elements/unified-balance/unified-balance";

const UnifiedBalanceShowcase = () => {
  return (
    <ShowcaseWrapper
      heading="Nexus Unified Balance"
      connectLabel="Connect wallet to use Nexus Unified Balance"
    >
      <UnifiedBalance />
    </ShowcaseWrapper>
  );
};

export default UnifiedBalanceShowcase;
