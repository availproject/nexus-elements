"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Separator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="separator"
      role="separator"
      className={cn("bg-border my-2 h-[1px] w-full", className)}
      {...props}
    />
  );
}

export { Separator };
