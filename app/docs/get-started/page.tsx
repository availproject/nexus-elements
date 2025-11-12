import React, { useCallback } from "react";
import Link from "next/link";
import { Button } from "@/registry/nexus-elements/ui/button";
import { CliCommand } from "@/components/showcase/cli-command";
import { ExternalLink, Info, SquareArrowUpRight } from "lucide-react";
import { CodeSnippet } from "@/components/showcase/code-snippet";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

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

export default function GetStartedPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Get Started</h1>
        <p className="text-foreground/70 text-lg max-w-2xl">
          Install and configure Nexus Elements in your React project. These
          components are prebuilt with full Nexus SDK integration, perfect for
          plug-and-play integration.
        </p>
      </div>

      {/* Important Note */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-foreground/70 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Important Note</p>
            <p className="text-foreground/70">
              Nexus Elements internally uses <strong>shadcn/ui</strong>{" "}
              components as its foundation. While you can copy and paste
              components without shadcn, we strongly recommend using shadcn/ui
              for the best experience, optimal performance, and seamless
              integration.
            </p>
          </div>
        </div>
      </div>

      {/* Install shadcn/ui */}
      <section className="space-y-4">
        <div>
          <h2
            id="install-shadcn"
            className="text-2xl font-semibold tracking-tight"
          >
            Install shadcn/ui
          </h2>
          <p className="text-foreground/70 mt-2">
            If you haven't already, set up shadcn/ui in your project first.
            Follow the official installation guide:
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link
              href="https://ui.shadcn.com/docs/installation"
              target="_blank"
              rel="noopener noreferrer"
            >
              Install shadcn/ui
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-sm text-foreground/70">
            Once installed, come back to continue with Nexus Elements.
          </p>
        </div>
      </section>

      {/* Install Components */}
      <section className="space-y-4">
        <div>
          <h2
            id="install-components"
            className="text-2xl font-semibold tracking-tight"
          >
            Add Components
          </h2>
          <p className="text-foreground/70 mt-2">
            You can now start adding Nexus Elements components to your project.
            Replace{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
              component-name
            </code>{" "}
            with the component you want to install (e.g.,{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
              unified-balance
            </code>
            ).
          </p>
        </div>
        <CliCommand url={`${BASE_URL}/r/unified-balance.json`} />
        <p className="text-sm text-foreground/70">
          The command above will add the component to your project. Each
          component includes all required files and dependencies.
        </p>
      </section>

      <section className="space-y-4">
        <div className="rounded-md w-full mt-8">
          <h2 id="usage" className="text-xl font-semibold mb-3">
            Usage
          </h2>
          <p className="text-sm text-foreground mb-2">
            Wrap your app with the provider:
          </p>
          <CodeSnippet
            code={providerSetupCode}
            lang="tsx"
            filename="app/layout.tsx"
            variant="usage"
          />
          <p className="text-sm text-foreground font-semibold my-3">
            Initialize on wallet connect:
          </p>
          <CodeSnippet
            code={initCode}
            lang="tsx"
            filename="components/InitNexusOnConnect.tsx"
            variant="usage"
          />
        </div>
      </section>

      {/* Copy & Paste Alternative */}
      <section className="space-y-4">
        <div>
          <h2 id="copy-paste" className="text-2xl font-semibold tracking-tight">
            Copy & Paste
          </h2>
          <p className="text-foreground/70 mt-2">
            Don't want to use shadcn/ui? You can copy and paste components
            directly into your project. Visit any component page and use the{" "}
            <strong>Code</strong> tab to view and copy the source files.
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium mb-2">Note:</p>
          <ul className="text-sm text-foreground/70 space-y-1 list-disc list-inside">
            <li>Ensure all peer dependencies are installed</li>
            <li>
              Set up the required UI primitives (buttons, inputs, dialogs, etc.)
              manually
            </li>
            <li>Configure styling and theming yourself</li>
            <li>Handle any compatibility issues that may arise</li>
          </ul>
        </div>
      </section>

      {/* Next Steps */}
      <section className="flex flex-col items-start gap-y-4">
        <h2 id="next-steps" className="text-2xl font-semibold tracking-tight">
          Next Steps
        </h2>
        <div className="flex items-center gap-x-3">
          <Button asChild variant="link" className="px-0">
            <Link
              href="/components/fast-bridge"
              className="px-0 underline-offset-4 hover:underline"
            >
              <SquareArrowUpRight className="size-4" />
              Browse Components
            </Link>
          </Button>
          <Button asChild variant="link" className="px-0">
            <Link
              href="/experience"
              className="px-0 underline-offset-4 hover:underline"
            >
              <SquareArrowUpRight className="size-4" />
              Experience Nexus
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
