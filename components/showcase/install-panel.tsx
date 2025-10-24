"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/registry/nexus-elements/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

type PmSelectorProps = Readonly<{
  pm: PackageManager;
  onChange: (value: PackageManager) => void;
}>;

function PmSelector({ pm, onChange }: PmSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={pm}
      onValueChange={(val) => val && onChange(val as PackageManager)}
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Select package manager"
    >
      <ToggleGroupItem value="pnpm">pnpm</ToggleGroupItem>
      <ToggleGroupItem value="npm">npm</ToggleGroupItem>
      <ToggleGroupItem value="yarn">yarn</ToggleGroupItem>
      <ToggleGroupItem value="bun">bun</ToggleGroupItem>
    </ToggleGroup>
  );
}

export function InstallPanel({
  registryItemName,
}: Readonly<{
  registryItemName: string;
}>) {
  const [pm, setPm] = useState<PackageManager>("pnpm");
  const [deps, setDeps] = useState<string[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [depsError, setDepsError] = useState<string | null>(null);

  const buildUrl = (item: string) =>
    `${process.env.NEXT_PUBLIC_BASE_URL}/r/${item}.json`;

  const computeUrlCmd = (item: string) => {
    const url = buildUrl(item);
    switch (pm) {
      case "npm":
        return `npx shadcn@latest add ${url}`;
      case "yarn":
        return `yarn dlx shadcn@latest add ${url}`;
      case "bun":
        return `bunx shadcn@latest add ${url}`;
      default:
        return `pnpm dlx shadcn@latest add ${url}`;
    }
  };

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

  const computeDepsInstallCmd = useMemo(() => {
    if (!deps?.length) return "";
    const list = deps.join(" ");
    switch (pm) {
      case "npm":
        return `npm i ${list}`;
      case "yarn":
        return `yarn add ${list}`;
      case "bun":
        return `bun add ${list}`;
      default:
        return `pnpm add ${list}`;
    }
  }, [pm, deps]);

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
    return (
      <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-w-6xl no-scrollbar">
        <code>{computeDepsInstallCmd ?? ""}</code>
      </pre>
    );
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
            <PmSelector pm={pm} onChange={(val) => setPm(val)} />
            <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
              <code>{computeUrlCmd(registryItemName)}</code>
            </pre>
            <p className="text-xs text-muted-foreground">
              Dependencies (including provider) are installed automatically.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <div className="space-y-2">
            <PmSelector pm={pm} onChange={(val) => setPm(val)} />

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
