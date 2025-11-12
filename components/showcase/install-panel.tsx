"use client";
import React, { useEffect, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/registry/nexus-elements/ui/tabs";
import { CliCommand } from "./cli-command";

export function InstallPanel({
  registryItemName,
}: Readonly<{
  registryItemName: string;
}>) {
  const [deps, setDeps] = useState<string[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [depsError, setDepsError] = useState<string | null>(null);

  const buildUrl = (item: string) =>
    `${process.env.NEXT_PUBLIC_BASE_URL}/r/${item}.json`;

  useEffect(() => {
    let isCancelled = false;
    const loadDeps = async () => {
      setDepsLoading(true);
      setDepsError(null);
      try {
        const urls = [buildUrl(registryItemName), buildUrl("nexus-provider")];
        const results = await Promise.all(
          urls.map(async (u) => {
            const res = await fetch(u);
            if (!res.ok) throw new Error(`Failed to fetch ${u}`);
            return (await res.json()) as { dependencies?: string[] };
          })
        );
        const all = results.flatMap((j) => j?.dependencies || []);
        const unique = Array.from(new Set(all));
        if (!isCancelled) setDeps(unique);
      } catch (e) {
        console.error(e);
        if (!isCancelled)
          setDepsError((e as Error)?.message || "Failed to load dependencies");
      } finally {
        if (!isCancelled) setDepsLoading(false);
      }
    };
    loadDeps();
    return () => {
      isCancelled = true;
    };
  }, [registryItemName]);

  const renderDependencies = () => {
    if (depsLoading) {
      return (
        <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
          Loading dependencies...
        </pre>
      );
    }
    if (depsError) {
      return (
        <pre className="text-xs bg-red-50 text-red-700 rounded p-2 overflow-x-auto">
          {depsError}
        </pre>
      );
    }
    if (!deps?.length) {
      return null;
    }
    return <CliCommand url={buildUrl(registryItemName)} />;
  };

  return (
    <div className="rounded-md border p-3 w-full">
      <p className="text-sm font-semibold mb-2">Installation</p>
      <Tabs defaultValue="cli" className="mt-2">
        <TabsList>
          <TabsTrigger value="cli">CLI</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="cli">
          <div className="space-y-2">
            <CliCommand url={buildUrl(registryItemName)} />
            <p className="text-xs text-muted-foreground">
              Dependencies (including provider) are installed automatically.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <div className="space-y-2">
            <p className="text-sm">Install required packages:</p>
            {renderDependencies()}

            <p className="text-sm">Then copy code files:</p>
            <ul className="list-disc ml-6 text-sm space-y-1">
              <li>
                Provider: open the <span className="font-semibold">Code</span>{" "}
                tab → select <span className="font-semibold">Provider</span> and
                copy{" "}
                <code className="mx-1">components/nexus/NexusProvider.tsx</code>
              </li>
              <li>
                Component: in the <span className="font-semibold">Code</span>{" "}
                tab → select <span className="font-semibold">Component</span>{" "}
                and copy the files for{" "}
                <code className="mx-1">{registryItemName}</code> into your
                project.
              </li>
            </ul>

            <p className="text-xs text-muted-foreground">
              Note: UI primitives (e.g. accordion, button, card, dialog, input,
              label, select, separator) should exist in your project. Install
              them via the shadcn CLI or use your own equivalents.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
