"use client";

import React, { useMemo, useState } from "react";
import { useNexus } from "../../nexus/NexusProvider";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { TOKEN_IMAGES } from "../../swaps/config/destination";
import type { SelectedSource } from "../hooks/useSwapDeposit";

interface TokenMultiSelectProps {
  title?: string;
  onContinue?: (sources: SelectedSource[]) => void;
}

type Row = {
  symbol: string;
  total: number;
  usd: number;
  logo?: string;
  sources: SelectedSource[];
};

const TokenMultiSelect: React.FC<TokenMultiSelectProps> = ({
  title = "Deposit",
  onContinue,
}) => {
  const { unifiedBalance, getFiatValue } = useNexus();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const rows: Row[] = useMemo(() => {
    const assets = unifiedBalance ?? [];
    const map = new Map<string, Row>();
    for (const asset of assets) {
      const symbol = asset?.symbol ?? "";
      if (!symbol) continue;
      const breakdown = asset?.breakdown ?? [];
      let total = 0;
      const sources: SelectedSource[] = [];
      for (const b of breakdown) {
        const bal = Number.parseFloat(String(b?.balance ?? "0"));
        if (Number.isFinite(bal) && bal > 0) {
          total += bal;
        }
        if (b?.chain?.id && b?.contractAddress) {
          sources.push({
            chainId: Number(b.chain.id),
            tokenAddress: String(b.contractAddress) as `0x${string}`,
            symbol: symbol,
            decimals: Number(b.decimals ?? asset.decimals ?? 18),
          });
        }
      }
      const usd = Number.parseFloat(getFiatValue(total, symbol) || "0");
      const row: Row = {
        symbol,
        total,
        usd,
        logo: TOKEN_IMAGES[symbol],
        sources,
      };
      const existing = map.get(symbol);
      if (existing) {
        // merge if multiple assets with same symbol exist
        existing.total += row.total;
        existing.usd += row.usd;
        existing.sources.push(...row.sources);
      } else {
        map.set(symbol, row);
      }
    }
    const list = Array.from(map.values());
    // sort by usd desc
    list.sort((a, b) => b.usd - a.usd);
    return list;
  }, [unifiedBalance, getFiatValue]);

  const toggle = (symbol: string) => {
    setSelected((prev) => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  const selectedSources = useMemo(() => {
    const chosen = new Set(Object.keys(selected).filter((s) => selected[s]));
    const merged: SelectedSource[] = [];
    for (const row of rows) {
      if (chosen.has(row.symbol)) {
        merged.push(...row.sources);
      }
    }
    return merged;
  }, [selected, rows]);

  const canContinue = selectedSources.length > 0;

  return (
    <div className="w-full ">
      <div className="flex items-center justify-between mb-4">
        <p className="text-base font-semibold">{title}</p>
      </div>
      <div className="flex flex-col  rounded-md max-h-[40svh] overflow-y-scroll">
        {rows.map((row) => (
          <div
            key={row.symbol}
            role="button"
            tabIndex={0}
            onClick={() => toggle(row.symbol)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(row.symbol);
              }
            }}
            className="w-full py-3 flex items-center justify-between hover:bg-muted/40 transition-colors text-left"
          >
            <div className="flex items-center gap-x-3">
              <img
                src={row.logo ?? ""}
                alt={row.symbol}
                width={28}
                height={28}
                className="rounded-full"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{row.symbol}</span>
                <span className="text-xs text-muted-foreground">
                  {row.total.toFixed(5)} {row.symbol}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-x-3">
              <span className="text-sm font-medium">${row.usd.toFixed(2)}</span>
              <Checkbox checked={Boolean(selected[row.symbol])} />
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 mt-4">
        <Button
          className="w-full"
          disabled={!canContinue}
          onClick={() => onContinue?.(selectedSources)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default TokenMultiSelect;
