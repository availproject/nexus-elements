"use client";
import * as React from "react";
import { Button } from "@/registry/nexus-elements/ui/button";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

type CliCommandProps = {
  url: string;
  className?: string;
  defaultPm?: PackageManager;
};

export function CliCommand({
  url,
  className,
  defaultPm = "pnpm",
}: Readonly<CliCommandProps>) {
  const [pm, setPm] = React.useState<PackageManager>(defaultPm);

  const getCommand = (): string => {
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

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCommand());
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-background overflow-hidden",
        className
      )}
    >
      {/* Package Manager Tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded bg-muted/20 text-[10px] font-medium text-muted-foreground">
            {">_"}
          </div>
          <ToggleGroup
            type="single"
            value={pm}
            onValueChange={(val) => val && setPm(val as PackageManager)}
            variant="outline"
            size="sm"
            spacing={0}
            className="h-auto"
          >
            <ToggleGroupItem value="pnpm" className="h-7 px-3 text-xs">
              pnpm
            </ToggleGroupItem>
            <ToggleGroupItem value="npm" className="h-7 px-3 text-xs">
              npm
            </ToggleGroupItem>
            <ToggleGroupItem value="yarn" className="h-7 px-3 text-xs">
              yarn
            </ToggleGroupItem>
            <ToggleGroupItem value="bun" className="h-7 px-3 text-xs">
              bun
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCopy}
          className="h-7 w-7 p-0"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Command Display */}
      <div className="bg-[#0d1117] px-4 py-3.5">
        <code className="text-sm text-[#c9d1d9] font-mono">{getCommand()}</code>
      </div>
    </div>
  );
}
