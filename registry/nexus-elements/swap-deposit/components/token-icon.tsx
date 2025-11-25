"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type TokenIconSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<TokenIconSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
};

interface TokenIconProps {
  symbol?: string;
  tokenLogo?: string;
  chainLogo?: string;
  size?: TokenIconSize;
  className?: string;
}

export const TokenIcon = ({
  symbol,
  tokenLogo,
  chainLogo,
  size = "md",
  className,
}: TokenIconProps) => {
  const dimension = SIZE_MAP[size];

  return (
    <span className={cn("relative inline-flex", className)}>
      {tokenLogo ? (
        <Image
          src={tokenLogo}
          alt={symbol ?? "token"}
          width={dimension}
          height={dimension}
          className="rounded-full object-cover"
        />
      ) : (
        <span
          className={cn(
            "rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold uppercase",
            {
              "h-6 w-6 text-xs": size === "sm",
              "h-8 w-8 text-sm": size === "md",
              "h-10 w-10 text-base": size === "lg",
            }
          )}
        >
          {symbol?.slice(0, 2) ?? "?"}
        </span>
      )}
      {chainLogo && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full border border-background bg-background">
          <Image
            src={chainLogo}
            alt="chain logo"
            width={Math.max(14, dimension * 0.4)}
            height={Math.max(14, dimension * 0.4)}
            className="rounded-full object-cover"
          />
        </span>
      )}
    </span>
  );
};

