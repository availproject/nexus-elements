"use client";

import React from "react";
import { CliCommand } from "../showcase/cli-command";
import { Tabs } from "@/registry/nexus-elements/ui/tabs";

export function CodeTabs({ children }: React.ComponentProps<typeof Tabs>) {
  const [config, setConfig] = React.useState<{
    installationType: "cli" | "manual";
  }>({
    installationType: "cli",
  });

  const installationType = React.useMemo(() => {
    return config.installationType || "cli";
  }, [config]);

  return (
    <Tabs
      value={installationType}
      onValueChange={(value) =>
        setConfig({ ...config, installationType: value as "cli" | "manual" })
      }
      className="relative mt-6 w-full"
    >
      {children}
    </Tabs>
  );
}

export function InstallCommand({ name }: { name: string }) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://nexus-elements.vercel.app";
  const url = `${baseUrl}/r/${name}.json`;

  return <CliCommand url={url} className="mt-4" />;
}
