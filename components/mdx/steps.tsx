import React from "react";
import { cn } from "@/lib/utils";

type StepsProps = {
  children: React.ReactNode;
  className?: string;
};

type StepProps = {
  children: React.ReactNode;
  number?: number;
};

export function Steps({ children, className }: StepsProps) {
  return <div className={cn("space-y-4 my-6", className)}>{children}</div>;
}

export function Step({ children, number }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
        {number ?? "•"}
      </div>
      <div className="flex-1 space-y-2">{children}</div>
    </div>
  );
}
