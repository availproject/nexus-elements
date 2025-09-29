import React from "react";
import FastBridgeShowcase from "@/components/fast-bridge-showcase";
import UnifiedBalanceShowcase from "@/components/unified-balance-showcase";
import NexusProvider from "@/registry/nexus-elements/nexus/NexusProvider";
import NetworkToggle from "@/components/network-toggle";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<any>;
}) {
  const params = await searchParams;
  return (
    <div className="max-w-6xl mx-auto flex flex-col min-h-svh px-4 py-8 gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Nexus Elements</h1>
        <p className="text-muted-foreground">
          A custom registry for distributing code using shadcn for Avail Nexus.
        </p>
      </header>
      <NexusProvider
        config={{
          network: params?.network ?? "mainnet",
          debug: true,
        }}
      >
        <main className="flex flex-col flex-1 gap-8">
          <NetworkToggle currentNetwork={params?.network ?? "mainnet"} />
          <FastBridgeShowcase />
          <UnifiedBalanceShowcase />
        </main>
      </NexusProvider>
    </div>
  );
}
