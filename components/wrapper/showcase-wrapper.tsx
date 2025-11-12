import React from "react";
import { PreviewPanel } from "../showcase/preview-panel";
import dynamic from "next/dynamic";
import { Skeleton } from "../ui/skeleton";

const ShowcaseWrapper = ({
  children,
  connectLabel = "Connect wallet to use Nexus",
}: {
  children: React.ReactNode;
  connectLabel?: string;
}) => {
  return <PreviewPanel connectLabel={connectLabel}>{children}</PreviewPanel>;
};

export default ShowcaseWrapper;
