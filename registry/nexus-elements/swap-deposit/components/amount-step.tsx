"use client";

import React, { useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { useNexus } from "../../nexus/NexusProvider";
import type { SelectedSource } from "../hooks/useSwapDeposit";
import { TOKEN_IMAGES } from "../../swaps/config/destination";
import { Input } from "../../ui/input";

interface AmountStepProps {
  title?: string;
  selectedSources: SelectedSource[];
  destinationSymbol?: string;
  destinationLogo?: string;
  onBack?: () => void;
  onContinue?: (totalUsd: string) => void;
  onEditSources?: () => void;
  onEditDestination?: () => void;
}

const quickFractions = [0.25, 0.5, 0.75, 1];

const AmountStep: React.FC<AmountStepProps> = ({
  title = "Deposit",
  selectedSources,
  destinationSymbol,
  destinationLogo,
  onBack,
  onContinue,
  onEditSources,
  onEditDestination,
}) => {
  const { unifiedBalance, getFiatValue } = useNexus();
  const [usd, setUsd] = useState<string>("");

  const totalAvailableUsd = useMemo(() => {
    // Sum across selected sources using unified balance breakdowns
    const selectedSet = new Set(
      selectedSources.map((s) => `${s.chainId}:${s.tokenAddress.toLowerCase()}`)
    );
    let total = 0;
    for (const asset of unifiedBalance ?? []) {
      const symbol = asset?.symbol ?? "";
      for (const b of asset?.breakdown ?? []) {
        const key = `${b?.chain?.id}:${String(
          b?.contractAddress || ""
        ).toLowerCase()}`;
        if (!selectedSet.has(key)) continue;
        const bal = Number.parseFloat(String(b?.balance ?? "0"));
        if (!Number.isFinite(bal) || bal <= 0) continue;
        total += Number.parseFloat(getFiatValue(bal, symbol) || "0");
      }
    }
    return Math.max(0, total);
  }, [selectedSources, unifiedBalance, getFiatValue]);

  const youSendLabel = useMemo(() => {
    const uniqueSymbols = Array.from(
      new Set(selectedSources.map((s) => s.symbol))
    );
    if (uniqueSymbols.length === 1) return uniqueSymbols[0];
    if (uniqueSymbols.length === 0) return "—";
    return `${uniqueSymbols[0]} +${uniqueSymbols.length - 1}`;
  }, [selectedSources]);

  const youSendLogo = useMemo(() => {
    const sym = selectedSources[0]?.symbol;
    return sym ? TOKEN_IMAGES[sym] : undefined;
  }, [selectedSources]);

  const setFraction = (f: number) => {
    const next = (totalAvailableUsd * f).toFixed(2);
    setUsd(next);
  };

  const canContinue = useMemo(() => {
    const n = Number.parseFloat(usd || "0");
    return Number.isFinite(n) && n > 0 && n <= totalAvailableUsd + 0.01;
  }, [usd, totalAvailableUsd]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <Button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground"
          aria-label="Back"
        >
          ←
        </Button>
        <p className="text-base font-semibold">{title}</p>
        <span className="opacity-0">•</span>
      </div>

      <div className="rounded-xl bg-card/60 border px-4 py-8 flex flex-col items-center gap-3">
        <Input
          inputMode="decimal"
          aria-label="Amount in USD"
          placeholder="$0.00"
          className="bg-transparent text-5xl font-semibold tracking-tight text-center outline-none w-full"
          value={usd ? `$${usd}` : ""}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.]/g, "");
            setUsd(raw);
          }}
        />
        <p className="text-sm text-muted-foreground">
          {/* Destination preview: approximate 1:1 if destination is stablecoin */}
          {usd ? Number.parseFloat(usd).toFixed(5) : "0.00000"}{" "}
          {destinationSymbol ?? ""}
        </p>

        <div className="grid grid-cols-4 gap-2 mt-2 w-full max-w-sm">
          {quickFractions.map((f) => (
            <Button
              key={f}
              variant="secondary"
              onClick={() => setFraction(f)}
              className="w-full"
            >
              {f === 1 ? "Max" : `${Math.round(f * 100)}%`}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border px-3 py-3 bg-card/50">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onEditSources}
            className="flex-1 rounded-xl border bg-background/60 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
          >
            <div className="flex items-center gap-x-2">
              {youSendLogo ? (
                <img
                  src={youSendLogo}
                  alt={youSendLabel}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : null}
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">You send</span>
                <span className="text-sm font-medium">{youSendLabel}</span>
              </div>
            </div>
          </button>
          <span className="text-muted-foreground">→</span>
          <button
            type="button"
            onClick={onEditDestination}
            className="flex-1 rounded-xl border bg-background/60 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
          >
            <div className="flex items-center gap-x-2">
              {destinationLogo ? (
                <img
                  src={destinationLogo}
                  alt={destinationSymbol ?? "Destination"}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : null}
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  You receive
                </span>
                <span className="text-sm font-medium">
                  {destinationSymbol ?? "Destination"}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="sticky bottom-0 mt-6">
        <Button
          className="w-full"
          disabled={!canContinue}
          onClick={() => onContinue?.(usd)}
        >
          Continue
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Available: ${totalAvailableUsd.toFixed(2)}
        </p>
      </div>
    </div>
  );
};

export default AmountStep;
