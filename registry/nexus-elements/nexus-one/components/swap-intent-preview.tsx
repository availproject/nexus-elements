"use client";

import React, { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { type NexusOneMode, type DepositOpportunity } from "../types";
import { type SwapTokenOption } from "./swap-asset-selector";

export interface SwapIntentSource {
  amount: string;
  chain: { id: number; logo: string; name: string };
  token: { contractAddress: string; decimals: number; symbol: string };
}

export interface SwapIntentDestination {
  amount: string;
  chain: { id: number; logo: string; name: string };
  token: { contractAddress: string; decimals: number; symbol: string };
  gas: {
    amount: string;
    token: { contractAddress: string; decimals: number; symbol: string };
  };
}

export interface SwapIntentData {
  sources: SwapIntentSource[];
  destination: SwapIntentDestination;
}

export interface SwapIntentPreviewProps {
  fromTokens?: SwapTokenOption[];
  fromToken?: SwapTokenOption;
  toToken?: SwapTokenOption;
  fromAmount: string;
  fromAmountUsd?: string;
  toAmount?: string;
  toAmountUsd?: string;
  toAmountTokens?: string;
  totalFeeUsd?: string;
  estimatedTime?: string;
  isLoading?: boolean;
  intentData?: SwapIntentData | null;
  mode?: NexusOneMode;
  opportunity?: DepositOpportunity;
  swapBalances?: any[] | null;
  supportedTokenAssets?: any[] | null;
  activeMode?: NexusOneMode;
  onAccept: () => void;
  onReject: () => void;
}

const fontFamily = '"Geist", var(--font-geist-sans), system-ui, sans-serif';
const primary = "var(--foreground-primary, #161615)";
const muted = "var(--foreground-muted, #848483)";
const border = "var(--border-default, #E8E8E7)";
const brand = "var(--foreground-brand, #006BF4)";

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (
  value: unknown,
  options: { min?: number; max?: number } = {},
) => {
  const amount = parseNumber(value);
  const min = options.min ?? 2;
  const max = options.max ?? 2;
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
};

const formatTokenAmount = (value: unknown) => {
  const amount = parseNumber(value);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: amount >= 1 ? 2 : 4,
    maximumFractionDigits: amount >= 1 ? 6 : 8,
  });
};

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

function DetailToggle({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        alignItems: "center",
        background: "transparent",
        border: "none",
        color: brand,
        cursor: "pointer",
        display: "flex",
        fontFamily,
        fontSize: "15px",
        gap: "4px",
        lineHeight: "20px",
        padding: 0,
      }}
    >
      {expanded ? "Hide Details" : "View Details"}
      <ChevronDown
        style={{
          height: 16,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 180ms ease",
          width: 16,
        }}
      />
    </button>
  );
}

function Row({
  title,
  subtitle,
  value,
  secondaryValue,
  children,
}: {
  title: string;
  subtitle: string;
  value: string;
  secondaryValue?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderTop: `1px solid ${border}`,
        display: "flex",
        justifyContent: "space-between",
        padding: "22px 20px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div
          style={{
            color: primary,
            fontFamily,
            fontSize: "18px",
            fontWeight: 600,
            lineHeight: "24px",
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: muted,
            fontFamily,
            fontSize: "16px",
            lineHeight: "22px",
          }}
        >
          {subtitle}
        </div>
      </div>
      <div
        style={{
          alignItems: "flex-end",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          textAlign: "right",
        }}
      >
        <div
          style={{
            color: primary,
            fontFamily,
            fontSize: "18px",
            fontWeight: 600,
            lineHeight: "24px",
          }}
        >
          {value}
        </div>
        {secondaryValue ? (
          <div
            style={{
              color: muted,
              fontFamily,
              fontSize: "16px",
              lineHeight: "22px",
            }}
          >
            {secondaryValue}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function AnimatedDetails({
  open,
  children,
  background = "#F9F9F8",
  gap = "12px",
  padding = "18px 20px",
}: {
  open: boolean;
  children: React.ReactNode;
  background?: string;
  gap?: string;
  padding?: string;
}) {
  return (
    <div
      aria-hidden={!open}
      style={{
        background,
        borderTop: `1px solid ${border}`,
        borderTopWidth: open ? "1px" : 0,
        display: "grid",
        gridTemplateRows: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transition:
          "grid-template-rows 220ms ease, opacity 180ms ease, border-top-width 220ms ease",
      }}
    >
      <div style={{ minHeight: 0, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap,
            padding: open ? padding : "0 20px",
            transition: "padding 220ms ease",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function SwapIntentPreview({
  fromTokens,
  fromToken,
  toToken,
  fromAmount,
  fromAmountUsd,
  toAmount,
  toAmountUsd,
  toAmountTokens,
  totalFeeUsd,
  isLoading,
  intentData,
  mode,
  opportunity,
  activeMode,
  onAccept,
}: SwapIntentPreviewProps) {
  const [showSourceDetails, setShowSourceDetails] = useState(false);
  const [showFeeDetails, setShowFeeDetails] = useState(false);
  const [showImpactDetails, setShowImpactDetails] = useState(true);

  const flowMode = mode ?? activeMode ?? "swap";
  const intentSources = intentData?.sources ?? [];
  const intentDest = intentData?.destination;
  const fallbackSources =
    fromTokens && fromTokens.length > 0
      ? fromTokens
      : fromToken
        ? [fromToken]
        : [];

  const sourceSymbols =
    intentSources.length > 0
      ? unique(intentSources.map((source) => source.token.symbol))
      : unique(fallbackSources.map((source) => source.symbol));
  const sourceLabel = sourceSymbols.length > 0 ? sourceSymbols.join(", ") : "-";
  const sourceAssetCount =
    intentSources.length || fallbackSources.length || sourceSymbols.length;

  const destTokenSymbol =
    intentDest?.token.symbol || toToken?.symbol || opportunity?.tokenSymbol || "-";
  const destChainName =
    flowMode === "deposit"
      ? opportunity?.title || opportunity?.protocol || "Opportunity"
      : intentDest?.chain.name || toToken?.chainName || "";

  const sourceUsdNumber =
    intentSources.length > 0
      ? intentSources.reduce(
          (sum, source) => sum + parseNumber((source as any).value),
          0,
        )
      : parseNumber(fromAmountUsd || fromAmount);
  const destinationUsdNumber = parseNumber(
    (intentDest as any)?.value || toAmountUsd || toAmount || intentDest?.amount,
  );
  const feeNumber =
    parseNumber(totalFeeUsd || (intentData as any)?.fees?.total) ||
    Math.max(sourceUsdNumber - destinationUsdNumber, 0);
  const priceImpactUsd =
    parseNumber((intentData as any)?.priceImpactUsd) || feeNumber;
  const swapImpactPercent =
    parseNumber((intentData as any)?.swapImpactPercent) ||
    parseNumber((intentData as any)?.priceImpactPercent) ||
    (sourceUsdNumber > 0
      ? ((destinationUsdNumber - sourceUsdNumber) / sourceUsdNumber) * 100
      : 0);

  const destinationTokenAmount =
    intentDest?.amount || toAmountTokens || toAmount || "0";
  const minReceived =
    (intentData as any)?.minimumReceived ||
    (intentDest as any)?.minimumReceived ||
    destinationTokenAmount;

  const sourceUsd = `${formatAmount(sourceUsdNumber)} USD`;
  const receiveUsd = `${formatAmount(destinationUsdNumber)} USD`;
  const feeUsd = feeNumber > 0 ? `-${formatAmount(feeNumber)} USD` : "0.00 USD";
  const impactUsd =
    priceImpactUsd > 0 ? `-${formatAmount(priceImpactUsd)} USD` : "0.00 USD";
  const impactPercent = `${formatAmount(swapImpactPercent, {
    min: 2,
    max: 2,
  })}%`;

  const ctaLabel =
    flowMode === "deposit"
      ? "Deposit now"
      : flowMode === "send"
        ? "Send now"
        : "Swap now";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div
        style={{
          background: "#FFFFFE",
          border: `1px solid ${border}`,
          borderRadius: "12px",
          boxShadow: "0px 1px 12px 0px #5B5B5B0D",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(180deg, #FFFFFE 0%, #EEF5FF 100%)",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            minHeight: "150px",
            padding: "42px 28px 34px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                alignItems: "baseline",
                color: primary,
                display: "flex",
                gap: "8px",
                fontFamily,
                fontSize: "28px",
                fontWeight: 600,
                lineHeight: "34px",
              }}
            >
              {formatAmount(sourceUsdNumber)}
              <span style={{ color: muted, fontSize: "16px", fontWeight: 500 }}>
                USD
              </span>
            </div>
            <div
              style={{
                color: muted,
                fontFamily,
                fontSize: "17px",
                lineHeight: "24px",
              }}
            >
              {sourceAssetCount || 1} asset{(sourceAssetCount || 1) === 1 ? "" : "s"}
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              alignItems: "center",
              display: "flex",
              gap: "7px",
              justifyContent: "center",
              padding: "0 28px",
            }}
          >
            {[0, 1, 2, 3, 4].map((index) => (
              <span
                key={index}
                style={{
                  background: index === 2 ? "#006BF4" : "#9FC4FF",
                  borderRadius: "2px",
                  display: "block",
                  height: "7px",
                  opacity: index === 0 || index === 4 ? 0.45 : 1,
                  width: "7px",
                }}
              />
            ))}
          </div>

          <div
            style={{
              alignItems: "flex-end",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              textAlign: "right",
            }}
          >
            <div
              style={{
                alignItems: "baseline",
                color: primary,
                display: "flex",
                gap: "8px",
                fontFamily,
                fontSize: "28px",
                fontWeight: 600,
                lineHeight: "34px",
              }}
            >
              {formatAmount(destinationTokenAmount)}
              <span style={{ color: muted, fontSize: "16px", fontWeight: 500 }}>
                {destTokenSymbol}
              </span>
            </div>
            <div
              style={{
                color: muted,
                fontFamily,
                fontSize: "17px",
                lineHeight: "24px",
              }}
            >
              {destChainName ? `on ${destChainName}` : destTokenSymbol}
            </div>
          </div>
        </div>

        <Row title="You Swap" subtitle={sourceLabel} value={sourceUsd}>
          <DetailToggle
            expanded={showSourceDetails}
            onClick={() => setShowSourceDetails((value) => !value)}
          />
        </Row>

        <AnimatedDetails open={showSourceDetails}>
          {(intentSources.length > 0 ? intentSources : []).map((source) => (
            <div
              key={`${source.chain.id}-${source.token.contractAddress}`}
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: muted, fontFamily, fontSize: "15px" }}>
                {source.token.symbol} on {source.chain.name}
              </span>
              <span style={{ color: primary, fontFamily, fontSize: "15px" }}>
                {formatTokenAmount(source.amount)} {source.token.symbol}
              </span>
            </div>
          ))}
        </AnimatedDetails>

        <Row
          title="You Receive"
          subtitle={
            destChainName ? `${destTokenSymbol} on ${destChainName}` : destTokenSymbol
          }
          value={receiveUsd}
          secondaryValue={`${formatTokenAmount(destinationTokenAmount)} ${destTokenSymbol}`}
        />

        <Row title="Total Fees" subtitle="Network & protocol" value={feeUsd}>
          <DetailToggle
            expanded={showFeeDetails}
            onClick={() => setShowFeeDetails((value) => !value)}
          />
        </Row>

        <AnimatedDetails open={showFeeDetails}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: muted, fontFamily, fontSize: "15px" }}>
              Network & protocol
            </span>
            <span style={{ color: primary, fontFamily, fontSize: "15px" }}>
              {feeUsd}
            </span>
          </div>
        </AnimatedDetails>

        <Row
          title="Price Impact"
          subtitle={`${destTokenSymbol} · estimated`}
          value={impactUsd}
        >
          <DetailToggle
            expanded={showImpactDetails}
            onClick={() => setShowImpactDetails((value) => !value)}
          />
        </Row>

        <AnimatedDetails
          open={showImpactDetails}
          background="#FAFAF9"
          gap="18px"
          padding="22px 20px"
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: muted, fontFamily, fontSize: "16px" }}>
              Swap Impact
            </span>
            <span
              style={{
                color: parseNumber(impactPercent) <= 0 ? "#168A47" : primary,
                fontFamily,
                fontSize: "16px",
              }}
            >
              {impactPercent}
            </span>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: muted, fontFamily, fontSize: "16px" }}>
              Max. Slippage
            </span>
            <span style={{ color: primary, fontFamily, fontSize: "16px" }}>
              Auto
            </span>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: muted, fontFamily, fontSize: "16px" }}>
              Min. Received
            </span>
            <span style={{ color: primary, fontFamily, fontSize: "16px" }}>
              {formatTokenAmount(minReceived)} {destTokenSymbol}
            </span>
          </div>
        </AnimatedDetails>
      </div>

      <Button
        onClick={onAccept}
        disabled={isLoading || (!toAmount && !intentDest)}
        style={{
          background: brand,
          borderRadius: "8px",
          boxShadow: "0px 1px 4px 0px #5555550D",
          color: "#FFFFFE",
          fontFamily,
          fontSize: "16px",
          fontWeight: 500,
          height: "60px",
          width: "100%",
        }}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : ctaLabel}
      </Button>
    </div>
  );
}
