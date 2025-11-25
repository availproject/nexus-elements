"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InfoRowProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export const InfoRow = ({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: InfoRowProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 leading-tight text-sm",
        className
      )}
    >
      <span className={cn("text-muted-foreground", labelClassName)}>
        {label}
      </span>
      <span className={cn("text-foreground font-medium", valueClassName)}>
        {value}
      </span>
    </div>
  );
};

