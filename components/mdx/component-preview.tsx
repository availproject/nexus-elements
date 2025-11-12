"use client";
import React from "react";
import dynamic from "next/dynamic";
import { PreviewPanel } from "../showcase/preview-panel";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

type ComponentPreviewProps = {
  name: string;
  className?: string;
  description?: string;
  align?: "start" | "center" | "end";
  children?: React.ReactNode;
};

// Map component names to their showcase components
const SHOWCASE_MAP: Record<
  string,
  () => Promise<{ default: React.ComponentType<any> }>
> = {
  "fast-bridge": () => import("@/components/wrapper/fast-bridge-showcase"),
  deposit: () => import("@/components/wrapper/deposit-showcase"),
  swaps: () => import("@/components/wrapper/swaps-showcase"),
  "unified-balance": () =>
    import("@/components/wrapper/unified-balance-showcase"),
};

export function ComponentPreview({
  name,
  className,
  description,
  align = "start",
  children,
}: ComponentPreviewProps) {
  const showcaseLoader = SHOWCASE_MAP[name];

  const DynamicShowcase = showcaseLoader
    ? dynamic(showcaseLoader, {
        ssr: false,
        loading: () => <Skeleton className="w-full h-full min-h-[450px]" />,
      })
    : null;

  return (
    <div className={cn("my-6", className)}>
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      <div
        className={cn(
          "flex",
          align === "center" && "justify-center",
          align === "end" && "justify-end"
        )}
      >
        {children || (DynamicShowcase && <DynamicShowcase />)}
      </div>
    </div>
  );
}
