import ViewHistory from "@/registry/nexus-elements/view-history/view-history";
import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";

const ViewHistoryShowcase = () => {
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use Nexus View History"
      type="view-history"
    >
      <ViewHistory />
    </ShowcaseWrapper>
  );
};

export default ViewHistoryShowcase;
