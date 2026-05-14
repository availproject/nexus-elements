"use client";

import React, { useEffect, useState } from "react";
import Decimal from "decimal.js";
import { Check, Loader2 } from "lucide-react";
import { type SwapStepType } from "@avail-project/nexus-core";
import { type NexusOneMode, type DepositOpportunity } from "../types";
import { type SwapTokenOption } from "./swap-asset-selector";
import { type SwapIntentData } from "./swap-intent-preview";

type ProgressStep = {
  id: number;
  completed: boolean;
  step: SwapStepType;
};

interface NexusOneProgressScreenProps {
  fromTokens?: SwapTokenOption[];
  toToken?: SwapTokenOption;
  fromAmountUsd?: string;
  toAmount?: string;
  toAmountUsd?: string;
  intentData?: SwapIntentData | null;
  mode: NexusOneMode;
  opportunity?: DepositOpportunity;
  steps?: ProgressStep[];
}

const fontFamily = '"Geist", var(--font-geist-sans), system-ui, sans-serif';
const primary = "var(--foreground-primary, #161615)";
const muted = "var(--foreground-muted, #848483)";
const border = "var(--border-default, #E8E8E7)";
const brand = "var(--foreground-brand, #006BF4)";

const parseDecimal = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (Decimal.isDecimal(value)) return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return undefined;
  }
  try {
    const parsed = new Decimal(cleaned);
    return parsed.isFinite() ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const formatDecimal = (value: unknown, decimals = 2) =>
  (parseDecimal(value) ?? new Decimal(0)).toDecimalPlaces(decimals).toFixed();

const formatUsd = (value: unknown) => `$${formatDecimal(value, 2)}`;

const unique = (values: Array<string | undefined>) =>
  Array.from(new Set(values.filter(Boolean) as string[]));

const formatSymbolSummary = (symbols: string[]) => {
  if (symbols.length <= 2) return symbols.join(", ");
  return `${symbols.slice(0, 2).join(", ")} and ${symbols.length - 2} others`;
};

const getStepType = (step?: SwapStepType) =>
  String((step as any)?.type ?? (step as any)?.typeID ?? "").toUpperCase();

const getStatusForStep = (step: SwapStepType | undefined, mode: NexusOneMode) => {
  const type = getStepType(step);

  if (
    [
      "SWAP_START",
      "DETERMINING_SWAP",
      "CREATE_PERMIT_EOA_TO_EPHEMERAL",
      "CREATE_PERMIT_FOR_SOURCE_SWAP",
      "INTENT_ACCEPTED",
      "INTENT_HASH_SIGNED",
      "INTENT_SUBMITTED",
      "ALLOWANCE_USER_APPROVAL",
      "ALLOWANCE_APPROVAL_MINED",
      "ALLOWANCE_ALL_DONE",
      "APPROVAL",
    ].some((token) => type.includes(token))
  ) {
    return "Verifying Intent";
  }

  if (
    type.includes("SOURCE_SWAP") ||
    type.includes("SOURCE_BATCH") ||
    type.includes("SWAP_SOURCE")
  ) {
    return "Swapping at sources";
  }

  if (
    type.includes("BRIDGE") ||
    type.includes("RFF") ||
    type.includes("INTENT_DEPOSIT") ||
    type.includes("INTENT_COLLECTION") ||
    type.includes("INTENT_FULFILLED")
  ) {
    return "Bridging";
  }

  if (type.includes("DESTINATION_SWAP") || type.includes("DESTINATION_BATCH")) {
    return "Swapping at destination";
  }

  if (type.includes("TRANSACTION_SENT") || type.includes("TRANSACTION_CONFIRMED")) {
    return mode === "deposit" ? "Depositing" : "Transferring / Sending";
  }

  if (type.includes("SWAP_COMPLETE")) {
    if (mode === "deposit") return "Depositing";
    if (mode === "send") return "Transferring / Sending";
    return "Swapping at destination";
  }

  if (mode === "deposit") return "Depositing";
  if (mode === "send") return "Transferring / Sending";
  return "Verifying Intent";
};

const getCurrentStatus = (steps: ProgressStep[] | undefined, mode: NexusOneMode) => {
  if (!steps || steps.length === 0) return "Verifying Intent";
  const current = steps.find((item) => !item.completed)?.step ?? steps.at(-1)?.step;
  return getStatusForStep(current, mode);
};

function MiniLogo({
  src,
  label,
  size,
  style,
}: {
  src?: string;
  label?: string;
  size: number;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (!failed && src) {
    return (
      <img
        src={src}
        alt={label || ""}
        onError={() => setFailed(true)}
        style={{
          background: "#FFFFFE",
          borderRadius: "999px",
          height: size,
          objectFit: "cover",
          width: size,
          ...style,
        }}
      />
    );
  }

  return (
    <span
      style={{
        alignItems: "center",
        background: "#E8F0FF",
        borderRadius: "999px",
        color: brand,
        display: "inline-flex",
        fontFamily,
        fontSize: Math.max(10, Math.round(size * 0.42)),
        fontWeight: 700,
        height: size,
        justifyContent: "center",
        width: size,
        ...style,
      }}
    >
      {(label || "?").trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

function TokenLogoPair({
  tokenLogo,
  chainLogo,
  tokenSymbol,
  chainName,
}: {
  tokenLogo?: string;
  chainLogo?: string;
  tokenSymbol?: string;
  chainName?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexShrink: 0,
        height: 34,
        position: "relative",
        width: 34,
      }}
    >
      <MiniLogo src={tokenLogo} label={tokenSymbol} size={34} />
      {chainLogo && (
        <MiniLogo
          src={chainLogo}
          label={chainName}
          size={14}
          style={{
            bottom: -1,
            outline: "1px solid #FFFFFE",
            position: "absolute",
            right: -1,
          }}
        />
      )}
    </span>
  );
}

export function NexusOneProgressScreen({
  fromTokens = [],
  toToken,
  fromAmountUsd,
  toAmount,
  intentData,
  mode,
  opportunity,
  steps,
}: NexusOneProgressScreenProps) {
  const intentSources = intentData?.sources ?? [];
  const intentDestination = intentData?.destination;
  const sourceSymbols =
    intentSources.length > 0
      ? unique(intentSources.map((source) => source.token.symbol))
      : unique(fromTokens.map((token) => token.symbol));
  const sourceUsd =
    intentSources.length > 0
      ? intentSources.reduce(
          (sum, source) => sum.plus(parseDecimal(source.value) ?? 0),
          new Decimal(0),
        )
      : parseDecimal(fromAmountUsd);
  const destinationAmount = intentDestination?.amount ?? toAmount ?? "0";
  const destinationSymbol =
    intentDestination?.token.symbol || toToken?.symbol || opportunity?.tokenSymbol || "";
  const destinationChain =
    mode === "deposit"
      ? opportunity?.title || opportunity?.protocol || intentDestination?.chain.name || ""
      : intentDestination?.chain.name || toToken?.chainName || "";
  const status = getCurrentStatus(steps, mode);
  const isComplete = Boolean(steps?.length && steps.every((step) => step.completed));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          background: "#FFFFFE",
          border: `1px solid ${border}`,
          borderRadius: "12px",
          boxShadow: "0px 1px 12px 0px #5B5B5B0D",
          boxSizing: "border-box",
          padding: "18px 20px 14px",
          width: "100%",
        }}
      >
        <div
          style={{
            color: muted,
            fontFamily,
            fontSize: "12px",
            lineHeight: "16px",
            textAlign: "center",
          }}
        >
          {formatSymbolSummary(sourceSymbols)}
        </div>
        <div
          style={{
            color: primary,
            fontFamily,
            fontSize: "22px",
            fontWeight: 600,
            lineHeight: "28px",
            marginTop: "2px",
            textAlign: "center",
          }}
        >
          {formatUsd(sourceUsd)}
        </div>

        <img
          src="/nexus-one/progress-grid.gif"
          alt=""
          aria-hidden="true"
          style={{
            display: "block",
            height: "148px",
            margin: "18px auto 12px",
            objectFit: "cover",
            width: "100%",
          }}
        />

        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div
            style={{
              alignItems: "center",
              color: primary,
              display: "flex",
              fontFamily,
              fontSize: "20px",
              fontWeight: 600,
              gap: "8px",
              lineHeight: "26px",
            }}
          >
            <TokenLogoPair
              tokenLogo={(intentDestination?.token as any)?.logo || toToken?.logo}
              chainLogo={intentDestination?.chain.logo || toToken?.chainLogo}
              tokenSymbol={destinationSymbol}
              chainName={destinationChain}
            />
            <span>{formatDecimal(destinationAmount, 9)}</span>
            <span style={{ fontSize: "13px", lineHeight: "18px" }}>
              {destinationSymbol}
            </span>
          </div>
          {destinationChain && (
            <div
              style={{
                color: muted,
                fontFamily,
                fontSize: "12px",
                lineHeight: "16px",
              }}
            >
              on {destinationChain}
            </div>
          )}
        </div>
      </div>

      <div
        aria-live="polite"
        style={{
          alignItems: "center",
          background: "#FFFFFE",
          border: `1px solid ${border}`,
          borderRadius: "10px",
          boxShadow: "0px 1px 12px 0px #5B5B5B0D",
          boxSizing: "border-box",
          color: primary,
          display: "flex",
          fontFamily,
          fontSize: "13px",
          fontWeight: 600,
          gap: "10px",
          minHeight: "48px",
          padding: "12px 16px",
          width: "100%",
        }}
      >
        {isComplete ? (
          <span
            style={{
              alignItems: "center",
              background: brand,
              borderRadius: "999px",
              color: "#FFFFFE",
              display: "inline-flex",
              height: "18px",
              justifyContent: "center",
              width: "18px",
            }}
          >
            <Check style={{ height: 13, width: 13 }} />
          </span>
        ) : (
          <Loader2
            className="animate-spin"
            style={{ color: brand, height: 18, width: 18 }}
          />
        )}
        <span>{status}</span>
      </div>
    </div>
  );
}
