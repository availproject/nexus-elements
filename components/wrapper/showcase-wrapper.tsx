"use client";
"use client";
import React from "react";
import { PreviewPanel } from "../showcase/preview-panel";
import NetworkToggle from "../docs/network-toggle";
import { useSearchParams } from "next/navigation";
import { NexusNetwork } from "@avail-project/nexus-core";

const ShowcaseWrapper = ({
  children,
  connectLabel = "Connect wallet to use Nexus",
}: {
  children: React.ReactNode;
  connectLabel?: string;
}) => {
  const searchParams = useSearchParams();
  const urlNetwork = (searchParams.get("network") || "devnet") as NexusNetwork;
  return (
    <div className="w-full flex flex-col gap-y-4">
      <NetworkToggle currentNetwork={urlNetwork ?? "devnet"} />
      <PreviewPanel connectLabel={connectLabel}>{children}</PreviewPanel>
    </div>
  );
};

export default ShowcaseWrapper;
