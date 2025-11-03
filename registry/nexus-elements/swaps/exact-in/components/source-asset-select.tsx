"use client";
import React, { FC, useMemo, useState } from "react";
import { Button } from "../../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../ui/dialog";
import { useNexus } from "../../../nexus/NexusProvider";
import { type SUPPORTED_CHAINS_IDS } from "@avail-project/nexus-core";

type SourceTokenInfo = {
  contractAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
};

interface SourceAssetSelectProps {
  selectedChain?: SUPPORTED_CHAINS_IDS;
  selectedToken?: SourceTokenInfo;
  onSelect: (
    chainId: SUPPORTED_CHAINS_IDS,
    token: SourceTokenInfo
  ) => void;
  disabled?: boolean;
  label?: string;
}

const SourceAssetSelect: FC<SourceAssetSelectProps> = ({
  selectedChain,
  selectedToken,
  onSelect,
  disabled,
  label = "From",
}) => {
  const { swapSupportedChainsAndTokens } = useNexus();
  const [open, setOpen] = useState(false);
  const [tempChain, setTempChain] = useState<number | null>(null);

  const chains = swapSupportedChainsAndTokens ?? [];
  const tokensForTempChain: SourceTokenInfo[] = useMemo(() => {
    if (!tempChain) return [] as SourceTokenInfo[];
    const c = chains.find((c: any) => c.id === tempChain);
    return (c?.tokens ?? []) as SourceTokenInfo[];
  }, [tempChain, chains]);

  const handlePick = (tok: SourceTokenInfo) => {
    if (!tempChain) return;
    onSelect(tempChain as SUPPORTED_CHAINS_IDS, tok);
    setOpen(false);
  };

  return (
    <div className="w-full">
      <p className="text-sm font-semibold mb-1">{label}</p>
      <Dialog open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-between" disabled={disabled}>
            <div className="flex items-center gap-x-2">
              {selectedChain && selectedToken ? (
                <>
                  {selectedToken.logo ? (
                    <img
                      src={selectedToken.logo}
                      alt={selectedToken.symbol}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  ) : null}
                  <span className="text-sm font-medium">{selectedToken.symbol}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Select chain and token</span>
              )}
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select source asset</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-md p-2 max-h-80 overflow-y-auto">
              <p className="text-xs font-medium mb-2">Chains</p>
              <div className="flex flex-col gap-y-1">
                {chains.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTempChain(c.id)}
                    className={`flex items-center gap-x-2 p-2 rounded hover:bg-muted ${
                      tempChain === c.id ? "bg-muted" : ""
                    }`}
                  >
                    <img src={c.logo} alt={c.name} width={18} height={18} className="rounded-full" />
                    <span className="text-sm">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border rounded-md p-2 max-h-80 overflow-y-auto">
              <p className="text-xs font-medium mb-2">Tokens</p>
              <div className="flex flex-col gap-y-1">
                {tempChain ? (
                  tokensForTempChain.map((t) => (
                    <button
                      key={t.symbol}
                      type="button"
                      onClick={() => handlePick(t)}
                      className="flex items-center gap-x-2 p-2 rounded hover:bg-muted"
                    >
                      {t.logo ? (
                        <img src={t.logo} alt={t.symbol} width={18} height={18} className="rounded-full" />
                      ) : null}
                      <span className="text-sm">{t.symbol}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Select a chain</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SourceAssetSelect;


