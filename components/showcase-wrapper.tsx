import * as React from "react";
import { OpenInV0Button } from "./open-in-v0-button";
import CodeBlock from "./ui/code-block";
import { PreviewPanel } from "./showcase/PreviewPanel";
import { CodeViewer } from "./showcase/CodeViewer";
import { InstallPanel } from "./showcase/InstallPanel";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/registry/nexus-elements/ui/tabs";

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
  return (
    <div className="flex flex-col gap-4 rounded-lg py-4 min-h-[450px] relative">
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-foreground font-semibold">{heading}</h2>
        <OpenInV0Button name={registryItemName} className="w-fit" />
      </div>

      <Tabs>
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

      <div className="grid gap-3 sm:grid-rows-1">
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

      <div className="rounded-md">
        <p className="text-sm font-semibold mb-2">Setup provider</p>
        <p className="text-sm text-foreground mb-2">
          Wrap your app with the provider:
        </p>
        <CodeBlock
          code={providerSetupCode}
          lang="tsx"
          filename="app/layout.tsx"
        />
        <p className="text-sm text-foreground my-3">
          Initialize on wallet connect:
        </p>
        <CodeBlock
          code={initCode}
          lang="tsx"
          filename="components/InitNexusOnConnect.tsx"
        />
      </div>
    </div>
  );
};

export default ShowcaseWrapper;
