import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import dynamic from "next/dynamic";
import { Skeleton } from "../ui/skeleton";
const UnifiedBalance = dynamic(
  () => import("@/registry/nexus-elements/unified-balance/unified-balance"),
  {
    loading: () => <Skeleton className="w-full h-full" />,
  }
);

const UnifiedBalanceShowcase = () => {
  return (
    <ShowcaseWrapper
      heading="Nexus Unified Balance"
      connectLabel="Connect wallet to use Nexus Unified Balance"
      registryItemName="unified-balance"
    >
      <UnifiedBalance />
    </ShowcaseWrapper>
  );
};

export default UnifiedBalanceShowcase;
