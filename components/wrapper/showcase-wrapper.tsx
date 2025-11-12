"use client";
import React from "react";
import { OpenInV0Button } from "../docs/open-in-v0-button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/registry/nexus-elements/ui/tabs";
import { PreviewPanel } from "../showcase/preview-panel";
import dynamic from "next/dynamic";
import { InstallPanel } from "../showcase/install-panel";
import { Skeleton } from "../ui/skeleton";
import CodeBlock from "../ui/code-block";
import NetworkToggle from "../docs/network-toggle";
import { NexusNetwork } from "@avail-project/nexus-core";
import { useSearchParams } from "next/navigation";

const CodeViewer = dynamic(
  () => import("../showcase/code-viewer").then((m) => m.CodeViewer),
  { loading: () => <Skeleton className="w-full h-full" /> }
);

const providerSetupCode = `"use client"
import NexusProvider from "@/components/nexus/NexusProvider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <NexusProvider>{children}</NexusProvider>
  )
}`;

const initCode = `import { useEffect } from "react"
import { useAccount } from "wagmi"
import { EthereumProvider } from "@avail-project/nexus-core"
import { useNexus } from "@/components/nexus/NexusProvider"

export function InitNexusOnConnect() {
  const { status, connector } = useAccount()
  const { handleInit } = useNexus()

  useEffect(() => {
    if (status === "connected") {
      connector?.getProvider().then((p) => handleInit(p as EthereumProvider))
    }
  }, [status])

  return null
}`;

const disabledTestnet = ["deposit", "swaps"];

const ShowcaseWrapper = ({
  children,
  heading = "Nexus Fast Bridge",
  connectLabel = "Connect wallet to use Nexus Fast Bridge",
  registryItemName = "fast-bridge",
}: {
  children: React.ReactNode;
  heading?: string;
  connectLabel?: string;
  registryItemName?: string;
}) => {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") || "devnet") as NexusNetwork;
  return (
    <div className="flex flex-col gap-4 rounded-lg py-4 min-h-[450px] relative">
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-foreground font-semibold">{heading}</h2>
        <div className="flex items-center gap-x-2">
          <NetworkToggle
            currentNetwork={network ?? "devnet"}
            disabled={disabledTestnet.includes(registryItemName)}
          />
          <OpenInV0Button name={registryItemName} className="w-fit" />
        </div>
      </div>

      <Tabs defaultValue="preview">
        <TabsList className="h-auto p-0 w-fit">
          <TabsTrigger value="preview" className="px-2 py-2 text-sm">
            Preview
          </TabsTrigger>
          <TabsTrigger value="code" className="px-2 py-2 text-sm">
            Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-2">
          <PreviewPanel connectLabel={connectLabel}>{children}</PreviewPanel>
        </TabsContent>
        <TabsContent value="code" className="mt-2">
          <CodeViewer registryItemName={registryItemName} />
        </TabsContent>
      </Tabs>

      <div className="flex flex-col items-start gap-y-3 w-full">
        <div className="rounded-md">
          <p className="text-sm font-semibold mb-2">About</p>
          <p className="text-sm text-muted-foreground">
            This example demonstrates the {heading} component. It uses a shared
            Nexus provider and shadcn/ui primitives. Install dependencies and
            copy the source files, or use the shadcn CLI.
          </p>
        </div>

        <InstallPanel registryItemName={registryItemName} />
      </div>

      <div className="rounded-md w-full">
        <p className="text-sm font-semibold mb-2">Setup provider</p>
        <p className="text-sm text-foreground mb-2">
          Wrap your app with the provider:
        </p>
        <div className="rounded-md border overflow-hidden">
          <CodeBlock
            code={providerSetupCode}
            lang="tsx"
            filename="app/layout.tsx"
          />
        </div>
        <p className="text-sm text-foreground font-semibold my-3">
          Initialize on wallet connect:
        </p>
        <div className="rounded-md border overflow-hidden">
          <CodeBlock
            code={initCode}
            lang="tsx"
            filename="components/InitNexusOnConnect.tsx"
          />
        </div>
      </div>
    </div>
  );
};

export default ShowcaseWrapper;
