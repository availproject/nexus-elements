"use client";
import * as React from "react";
import CodeBlock from "../ui/code-block";

export function InstallPanel({
  registryItemName,
}: Readonly<{
  registryItemName: string;
}>) {
  const [installTab, setInstallTab] = React.useState<"cli" | "manual">("cli");
  const [pm, setPm] = React.useState<"pnpm" | "npm" | "yarn" | "bun">("pnpm");
  const [deps, setDeps] = React.useState<string[]>([]);
  const [depsLoading, setDepsLoading] = React.useState(false);
  const [depsError, setDepsError] = React.useState<string | null>(null);

  const buildUrl = (item: string) =>
    `https://elements.nexus.availproject.org/r/${item}.json`;

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

  // Load dependencies for Manual install
  React.useEffect(() => {
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

  const computeDepsInstallCmd = React.useMemo(() => {
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

  return (
    <div className="rounded-md border p-3">
      <p className="text-sm font-semibold mb-2">Installation</p>
      <div className="flex items-center gap-4 border-b mb-3">
        <button
          className={`text-sm px-2 py-1 -mb-px ${
            installTab === "cli"
              ? "border-b-2 border-foreground font-semibold"
              : "text-muted-foreground"
          }`}
          onClick={() => setInstallTab("cli")}
        >
          CLI
        </button>
        <button
          className={`text-sm px-2 py-1 -mb-px ${
            installTab === "manual"
              ? "border-b-2 border-foreground font-semibold"
              : "text-muted-foreground"
          }`}
          onClick={() => setInstallTab("manual")}
        >
          Manual
        </button>
      </div>

      {installTab === "cli" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <button
              className={`px-2 py-1 rounded border ${
                pm === "pnpm" ? "bg-accent" : ""
              }`}
              onClick={() => setPm("pnpm")}
            >
              pnpm
            </button>
            <button
              className={`px-2 py-1 rounded border ${
                pm === "npm" ? "bg-accent" : ""
              }`}
              onClick={() => setPm("npm")}
            >
              npm
            </button>
            <button
              className={`px-2 py-1 rounded border ${
                pm === "yarn" ? "bg-accent" : ""
              }`}
              onClick={() => setPm("yarn")}
            >
              yarn
            </button>
            <button
              className={`px-2 py-1 rounded border ${
                pm === "bun" ? "bg-accent" : ""
              }`}
              onClick={() => setPm("bun")}
            >
              bun
            </button>
          </div>
          <CodeBlock code={computeUrlCmd(registryItemName)} lang="bash" />
          <p className="text-xs text-muted-foreground">
            Dependencies (including provider) are installed automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <button
              className={`px-2 py-1 rounded border ${
                pm === "pnpm" ? "bg-accent" : ""
              }`}
              onClick={() => setPm("pnpm")}
            >
              pnpm
            </button>
            <button
              className={`px-2 py-1 rounded border ${
                pm === "npm" ? "bg-accent" : ""
              }`}
              onClick={() => setPm("npm")}
            >
              npm
            </button>
            <button
              className={`px-2 py-1 rounded border ${
                pm === "yarn" ? "bg-accent" : ""
              }`}
              onClick={() => setPm("yarn")}
            >
              yarn
            </button>
            <button
              className={`px-2 py-1 rounded border ${
                pm === "bun" ? "bg-accent" : ""
              }`}
              onClick={() => setPm("bun")}
            >
              bun
            </button>
          </div>

          <p className="text-sm">Install required packages:</p>
          {depsLoading ? (
            <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
              Loading dependencies...
            </pre>
          ) : depsError ? (
            <pre className="text-xs bg-red-50 text-red-700 rounded p-2 overflow-x-auto">
              {depsError}
            </pre>
          ) : (
            <CodeBlock code={computeDepsInstallCmd || ""} lang="bash" />
          )}

          <p className="text-sm">Then copy code files:</p>
          <ul className="list-disc ml-6 text-sm space-y-1">
            <li>
              Provider: open the <span className="font-semibold">Code</span> tab
              → select <span className="font-semibold">Provider</span> and copy{" "}
              <code className="mx-1">components/nexus/NexusProvider.tsx</code>{" "}
              and <code className="mx-1">components/nexus/types.ts</code>.
            </li>
            <li>
              Component: in the <span className="font-semibold">Code</span> tab
              → select <span className="font-semibold">Component</span> and copy
              the files for <code className="mx-1">{registryItemName}</code>{" "}
              into your project.
            </li>
          </ul>

          <p className="text-xs text-muted-foreground">
            Note: UI primitives (e.g. accordion, button, card, dialog, input,
            label, select, separator) should exist in your project. Install them
            via the shadcn CLI or use your own equivalents.
          </p>
        </div>
      )}
    </div>
  );
}
