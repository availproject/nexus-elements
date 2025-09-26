"use client";
import * as React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LoaderPinwheel } from "lucide-react";
import { NexusSDK } from "@avail-project/nexus";

export function PreviewPanel({
  children,
  connectLabel,
  status,
  nexusSDK,
  loading,
}: Readonly<{
  children: React.ReactNode;
  connectLabel: string;
  status: string;
  nexusSDK: NexusSDK;
  loading: boolean;
}>) {
  return (
    <div className="rounded-lg border p-4">
      <ConnectButton />
      <div className="flex items-center justify-center min-h-[400px] relative">
        {status === "connected" && nexusSDK && <>{children}</>}
        {status !== "connected" && (
          <p className="text-lg font-semibold">{connectLabel}</p>
        )}
        {loading && <LoaderPinwheel className="size-6 animate-spin" />}
      </div>
    </div>
  );
}
