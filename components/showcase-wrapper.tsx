"use client";
import * as React from "react";
import { OpenInV0Button } from "./open-in-v0-button";
import { Separator } from "@/registry/nexus-elements/ui/separator";
import CodeBlock from "./ui/code-block";
import { PreviewPanel } from "./showcase/PreviewPanel";
import { CodeViewer } from "./showcase/CodeViewer";
import { InstallPanel } from "./showcase/InstallPanel";
import { Button } from "@/registry/nexus-elements/ui/button";

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
  const [activeTab, setActiveTab] = React.useState<"preview" | "code">(
    "preview",
  );

  return (
    <div className="flex flex-col gap-4 border rounded-lg p-4 min-h-[450px] relative">
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-muted-foreground sm:pl-3 font-semibold">
          {heading}
        </h2>
        <OpenInV0Button name={registryItemName} className="w-fit" />
      </div>

      <div className="flex items-center gap-4 border-b">
        <Button
          role="tab"
          className={`text-sm px-2 py-2 -mb-px ${
            activeTab === "preview"
              ? "border-b-2 border-foreground font-semibold"
              : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("preview")}
        >
          Preview
        </Button>
        <Button
          variant={"secondary"}
          role="tab"
          className={`text-sm px-2 py-2 -mb-px ${
            activeTab === "code"
              ? "border-b-2 border-foreground font-semibold"
              : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("code")}
        >
          Code
        </Button>
      </div>

      {activeTab === "preview" ? (
        <PreviewPanel connectLabel={connectLabel}>{children}</PreviewPanel>
      ) : (
        <CodeViewer registryItemName={registryItemName} />
      )}

      <Separator />

      <div className="grid gap-3 sm:grid-rows-1">
        <div className="rounded-md border p-3">
          <p className="text-sm font-semibold mb-2">About</p>
          <p className="text-sm text-muted-foreground">
            This example demonstrates the {heading} component. It uses a shared
            Nexus provider and shadcn/ui primitives. You can install it via the
            shadcn CLI or copy source files directly.
          </p>
        </div>

        <InstallPanel registryItemName={registryItemName} />
      </div>

      <div className="rounded-md border p-3">
        <p className="text-sm font-semibold mb-2">Setup provider</p>
        <p className="text-sm text-foreground">
          Wrap your app with the provider:
        </p>
        <CodeBlock
          code={providerSetupCode}
          lang="tsx"
          filename="app/layout.tsx"
        />
        <p className="text-sm text-foreground mt-2 my-3">
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
