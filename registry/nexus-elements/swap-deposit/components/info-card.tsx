"use client";

import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface InfoCardProps extends PropsWithChildren {
  className?: string;
}

export const InfoCard = ({ className, children }: InfoCardProps) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card px-4 py-2 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
};

