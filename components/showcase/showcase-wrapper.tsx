"use client";
import React from "react";
import { PreviewPanel } from "../showcase/preview-panel";
import NetworkToggle from "../helpers/network-toggle";
import { useSearchParams } from "next/navigation";
import { NexusNetwork } from "@avail-project/nexus-core";

const disabledTestnet = ["deposit", "swaps"];

const ShowcaseWrapper = ({
  children,
  connectLabel = "Connect wallet to use Nexus",
  type,
}: {
  children: React.ReactNode;
  connectLabel?: string;
  type: "deposit" | "swaps" | "fast-bridge" | "unified-balance";
}) => {
  const searchParams = useSearchParams();
  const urlNetwork = (searchParams.get("network") || "devnet") as NexusNetwork;
  return (
    <div className="w-full flex flex-col gap-y-4">
      <NetworkToggle
        currentNetwork={urlNetwork ?? "devnet"}
        disabled={disabledTestnet.includes(type)}
      />

      <PreviewPanel connectLabel={connectLabel}>{children}</PreviewPanel>
    </div>
  );
};

export default ShowcaseWrapper;
