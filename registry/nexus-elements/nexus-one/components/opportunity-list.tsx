"use client";
import React from "react";
import { ChevronRight, TrendingUp } from "lucide-react";
import { type DepositOpportunity } from "../types";

interface OpportunityListProps {
  opportunities: DepositOpportunity[];
  onSelect: (opportunity: DepositOpportunity) => void;
}

/** Chain display names for common IDs */
const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  137: "Polygon",
  42161: "Arbitrum",
  10: "Optimism",
  8453: "Base",
  43114: "Avalanche",
  56: "BSC",
};

export function OpportunityList({ opportunities, onSelect }: OpportunityListProps) {
  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-8 gap-y-2">
        <p
          style={{
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontSize: "14px",
            color: "var(--foreground-muted, #848483)",
          }}
        >
          No opportunities configured
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-y-2">
      {opportunities.map((opp) => (
        <button
          key={opp.id}
          onClick={() => onSelect(opp)}
          className="w-full flex items-center gap-x-3 px-4 py-3 text-left transition-all hover:shadow-sm group"
          style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid var(--border-default, #E8E8E7)",
          }}
        >
          {/* Logo */}
          <div className="shrink-0 relative">
            {opp.logo ? (
              <img
                src={opp.logo}
                alt={opp.protocol}
                className="w-10 h-10 rounded-full border border-gray-100 object-cover shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "var(--background-tertiary, #F0F0EF)",
                }}
              >
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-x-2">
              <span
                className="truncate"
                style={{
                  fontFamily: "var(--font-geist-sans), sans-serif",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "var(--foreground-primary, #161615)",
                }}
              >
                {opp.label}
              </span>
              {opp.apy && (
                <span
                  className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: "#ECFDF5",
                    color: "#16A34A",
                    fontFamily: "var(--font-geist-sans), sans-serif",
                  }}
                >
                  {opp.apy} APY
                </span>
              )}
            </div>
            <div className="flex items-center gap-x-1.5 mt-0.5">
              <span
                style={{
                  fontFamily: "var(--font-geist-sans), sans-serif",
                  fontSize: "12px",
                  color: "var(--foreground-muted, #848483)",
                }}
              >
                {opp.protocol}
              </span>
              <span style={{ color: "var(--foreground-muted, #848483)", fontSize: "12px" }}>·</span>
              <span
                style={{
                  fontFamily: "var(--font-geist-sans), sans-serif",
                  fontSize: "12px",
                  color: "var(--foreground-muted, #848483)",
                }}
              >
                {CHAIN_NAMES[opp.chainId as number] ?? `Chain ${opp.chainId}`}
              </span>
              <span style={{ color: "var(--foreground-muted, #848483)", fontSize: "12px" }}>·</span>
              <span
                style={{
                  fontFamily: "var(--font-geist-sans), sans-serif",
                  fontSize: "12px",
                  color: "var(--foreground-muted, #848483)",
                }}
              >
                {opp.tokenSymbol}
              </span>
            </div>
            {opp.description && (
              <p
                className="mt-1 truncate"
                style={{
                  fontFamily: "var(--font-geist-sans), sans-serif",
                  fontSize: "11px",
                  color: "var(--foreground-muted, #848483)",
                }}
              >
                {opp.description}
              </p>
            )}
          </div>

          {/* Chevron */}
          <ChevronRight
            className="w-4 h-4 shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors"
          />
        </button>
      ))}
    </div>
  );
}
