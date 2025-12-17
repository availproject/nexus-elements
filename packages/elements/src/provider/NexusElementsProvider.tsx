"use client";
import React, { useMemo } from "react";
import NexusProvider from "@registry/nexus-elements/nexus/NexusProvider";

// Simple network type matching what NexusProvider expects
type NexusNetworkSimple = "mainnet" | "testnet";

export interface NexusElementsTheme {
  "--nexus-background"?: string;
  "--nexus-foreground"?: string;
  "--nexus-card"?: string;
  "--nexus-card-foreground"?: string;
  "--nexus-popover"?: string;
  "--nexus-popover-foreground"?: string;
  "--nexus-primary"?: string;
  "--nexus-primary-foreground"?: string;
  "--nexus-secondary"?: string;
  "--nexus-secondary-foreground"?: string;
  "--nexus-muted"?: string;
  "--nexus-muted-foreground"?: string;
  "--nexus-accent"?: string;
  "--nexus-accent-foreground"?: string;
  "--nexus-destructive"?: string;
  "--nexus-destructive-foreground"?: string;
  "--nexus-border"?: string;
  "--nexus-input"?: string;
  "--nexus-ring"?: string;
  "--nexus-radius"?: string;
  [key: `--nexus-${string}`]: string | undefined;
}

export interface NexusElementsProviderProps {
  children: React.ReactNode;
  network?: NexusNetworkSimple;
  theme?: NexusElementsTheme;
  debug?: boolean;
}

const defaultTheme: NexusElementsTheme = {
  "--nexus-background": "0 0% 100%",
  "--nexus-foreground": "0 0% 3.9%",
  "--nexus-card": "0 0% 100%",
  "--nexus-card-foreground": "0 0% 3.9%",
  "--nexus-popover": "0 0% 100%",
  "--nexus-popover-foreground": "0 0% 3.9%",
  "--nexus-primary": "0 0% 9%",
  "--nexus-primary-foreground": "0 0% 98%",
  "--nexus-secondary": "0 0% 96.1%",
  "--nexus-secondary-foreground": "0 0% 9%",
  "--nexus-muted": "0 0% 96.1%",
  "--nexus-muted-foreground": "0 0% 45.1%",
  "--nexus-accent": "0 0% 96.1%",
  "--nexus-accent-foreground": "0 0% 9%",
  "--nexus-destructive": "0 84.2% 60.2%",
  "--nexus-destructive-foreground": "0 0% 98%",
  "--nexus-border": "0 0% 89.8%",
  "--nexus-input": "0 0% 89.8%",
  "--nexus-ring": "0 0% 3.9%",
  "--nexus-radius": "0.5rem",
};

export function NexusElementsProvider({
  children,
  network = "mainnet",
  theme = {},
  debug = false,
}: NexusElementsProviderProps) {
  const mergedTheme = useMemo(() => ({ ...defaultTheme, ...theme }), [theme]);

  const styleVars = useMemo(() => {
    return Object.entries(mergedTheme)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value};`)
      .join("\n");
  }, [mergedTheme]);

  const nexusConfig = useMemo(() => ({ network, debug }), [network, debug]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{ __html: `.nexus-elements { ${styleVars} }` }}
      />
      <div className="nexus-elements">
        <NexusProvider config={nexusConfig}>{children}</NexusProvider>
      </div>
    </>
  );
}

export default NexusElementsProvider;
