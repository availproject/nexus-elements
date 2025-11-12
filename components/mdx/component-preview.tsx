import React from "react";
import dynamic from "next/dynamic";
import { ComponentSource } from "./component-source";
import { ComponentPreviewTabs } from "./component-preview-tabs";
import { Skeleton } from "@/components/ui/skeleton";

type ComponentPreviewProps = React.ComponentProps<"div"> & {
  name: string;
  styleName?: "nexus-elements";
  align?: "center" | "start" | "end";
  hideCode?: boolean;
  chromeLessOnMobile?: boolean;
  showAllFiles?: boolean;
};

// Map component names to their preview components
const SHOWCASE_MAP: Record<
  string,
  () => Promise<{ default: React.ComponentType<unknown> }>
> = {
  "fast-bridge": () => import("@/components/wrapper/fast-bridge-showcase"),
  deposit: () => import("@/components/wrapper/deposit-showcase"),
  swaps: () => import("@/components/wrapper/swaps-showcase"),
  "unified-balance": () =>
    import("@/components/wrapper/unified-balance-showcase"),
};

export function ComponentPreview({
  name,
  styleName = "nexus-elements",
  className,
  align = "center",
  hideCode = false,
  chromeLessOnMobile = false,
  showAllFiles = true,
  ...props
}: ComponentPreviewProps) {
  const showcaseLoader = SHOWCASE_MAP[name];

  if (!showcaseLoader) {
    return (
      <p className="text-muted-foreground mt-6 text-sm">
        Component{" "}
        <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm">
          {name}
        </code>{" "}
        not found in registry.
      </p>
    );
  }

  // Basic tabs container for MDX previews
  const Showcase = dynamic(showcaseLoader, {
    loading: () => <Skeleton className="w-full h-full" />,
  });

  return (
    <ComponentPreviewTabs
      className={className}
      align={align}
      hideCode={hideCode}
      component={<Showcase />}
      source={
        <ComponentSource
          name={name}
          collapsible={false}
          styleName={styleName}
          showAllFiles={showAllFiles}
        />
      }
      chromeLessOnMobile={chromeLessOnMobile}
      {...props}
    />
  );
}
