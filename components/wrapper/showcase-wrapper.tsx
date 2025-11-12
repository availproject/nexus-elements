"use client";
import React from "react";
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
import { CodeSnippet } from "../showcase/code-snippet";
import { Button } from "@/registry/nexus-elements/ui/button";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OnThisPage } from "../docs/on-this-page";
import { toast } from "sonner";

const CodeViewer = dynamic(
  () => import("../showcase/code-viewer").then((m) => m.CodeViewer),
  { loading: () => <Skeleton className="w-full h-full" /> }
);

const COMPONENTS = [
  { name: "Fast Bridge", path: "/components/fast-bridge", id: "fast-bridge" },
  { name: "Deposit", path: "/components/deposit", id: "deposit" },
  { name: "Swaps", path: "/components/swaps", id: "swaps" },
  {
    name: "Unified Balance",
    path: "/components/unified-balance",
    id: "unified-balance",
  },
];

const ShowcaseWrapper = ({
  children,
  heading = "Nexus Fast Bridge",
  connectLabel = "Connect wallet to use Nexus Fast Bridge",
  registryItemName = "fast-bridge",
  description,
}: {
  children: React.ReactNode;
  heading?: string;
  connectLabel?: string;
  registryItemName?: string;
  description?: string;
}) => {
  const pathname = usePathname();
  const currentIndex = COMPONENTS.findIndex((c) => c.path === pathname);
  const prevComponent = currentIndex > 0 ? COMPONENTS[currentIndex - 1] : null;
  const nextComponent =
    currentIndex < COMPONENTS.length - 1 ? COMPONENTS[currentIndex + 1] : null;

  const handleCopyPage = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Page URL copied to clipboard");
    } catch (e) {
      toast.error("Failed to copy page URL");
    }
  };

  const getDefaultDescription = () => {
    if (description) return description;
    const headingLower = heading.toLowerCase();
    if (headingLower.includes("bridge")) {
      return "Bridge assets across chains with source breakdown, fee details, progress steps, and allowance flow. Intent-based and optimized for UX.";
    }
    if (headingLower.includes("deposit")) {
      return "Deposit funds from anywhere in one flow. Simulates costs, supports execute only paths, and shows total/execute/bridge fees with clear confirmations.";
    }
    if (headingLower.includes("swap")) {
      return "Swap tokens across chains with support for exact input and exact output modes. Includes fee breakdown and transaction progress tracking.";
    }
    if (headingLower.includes("balance")) {
      return "Fetch and display token balances across supported chains, normalized to USD, and ready for product surfaces. Compatible with any design system.";
    }
    return `A production-ready React component powered by Avail Nexus. Install with a single command, theme with your design tokens, and ship faster with critical functionality already wired to the Nexus SDK.`;
  };

  const defaultDescription = getDefaultDescription();

  return (
    <div className="flex gap-8">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Title and actions */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {heading}
            </h1>
            <p className="text-muted-foreground">{defaultDescription}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyPage}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Page
            </Button>
            <div className="flex items-center gap-1">
              {prevComponent && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={prevComponent.path}>
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              {nextComponent && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={nextComponent.path}>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Docs and API Reference links */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
          </Link>
          <Link
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            API Reference
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex flex-col gap-4 rounded-lg py-4 min-h-[450px] relative">
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
              <PreviewPanel connectLabel={connectLabel}>
                {children}
              </PreviewPanel>
            </TabsContent>
            <TabsContent value="code" className="mt-2">
              <CodeViewer registryItemName={registryItemName} />
            </TabsContent>
          </Tabs>

          <div className="flex flex-col items-start gap-y-6 w-full mt-8">
            <div className="rounded-md w-full">
              <h2 id="about" className="text-xl font-semibold mb-3">
                About
              </h2>
              <p className="text-sm text-muted-foreground">
                This example demonstrates the {heading} component. It uses a
                shared Nexus provider and shadcn/ui primitives. Install
                dependencies and copy the source files, or use the shadcn CLI.
              </p>
            </div>
            <InstallPanel registryItemName={registryItemName} />
          </div>

          <div className="rounded-md w-full mt-8">
            <h2 id="usage" className="text-xl font-semibold mb-3">
              Usage
            </h2>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="hidden xl:block w-64 shrink-0">
        <OnThisPage />
      </div>
    </div>
  );
};

export default ShowcaseWrapper;
