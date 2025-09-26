"use client";
import * as React from "react";
import CodeBlock from "../ui/code-block";

export function InstallPanel({
  registryItemName,
}: {
  registryItemName: string;
}) {
  const [installTab, setInstallTab] = React.useState<"cli" | "manual">("cli");
  const [pm, setPm] = React.useState<"pnpm" | "npm" | "yarn" | "bun">("pnpm");

  const componentsJsonSnippet = `{
  "registries": {
    "@nexus-elements": "https://elements.nexus.availproject.org/r/{name}.json"
  }
}`;

  const installUrlCmd = `pnpm dlx shadcn@latest add https://elements.nexus.availproject.org/r/${registryItemName}.json`;
  const providerInstallUrlCmd = `pnpm dlx shadcn@latest add https://elements.nexus.availproject.org/r/nexus-provider.json`;

  const computeInstallCmd = (item: string) => {
    const ns = `https://elements.nexus.availproject.org/r/${item}.json`;
    switch (pm) {
      case "npm":
        return `npx shadcn@latest add ${ns}`;
      case "yarn":
        return `yarn dlx shadcn@latest add ${ns}`;
      case "bun":
        return `bunx shadcn@latest add ${ns}`;
      default:
        return `pnpm dlx shadcn@latest add ${ns}`;
    }
  };

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
          <CodeBlock code={computeInstallCmd(registryItemName)} lang="bash" />
          <p className="text-xs text-muted-foreground">
            Install the shared provider (optional if copying code manually):
          </p>
          <CodeBlock code={providerInstallUrlCmd} lang="bash" />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm">
            Map namespace in <code>components.json</code>:
          </p>
          <CodeBlock code={componentsJsonSnippet} lang="json" />
          <p className="text-sm">Then run:</p>
          <CodeBlock code={`${installUrlCmd}`} lang="bash" />
          <p className="text-sm mt-2">If installing manually, add Nexus SDK:</p>
          <CodeBlock code={`pnpm add @avail-project/nexus`} lang="bash" />
          <p className="text-xs text-muted-foreground">
            Then create the provider files below (or install via the provider
            URL above).
          </p>
        </div>
      )}
    </div>
  );
}
