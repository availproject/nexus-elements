"use client";
import React, { type FC, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import {
  type SUPPORTED_CHAINS_IDS,
  CHAIN_METADATA,
} from "@avail-project/nexus-core";
import { DESTINATION_SWAP_TOKENS, TOKEN_IMAGES } from "../config/destination";

type DestinationTokenInfo = {
  tokenAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
};

interface DestinationAssetSelectProps {
  selectedChain?: SUPPORTED_CHAINS_IDS;
  selectedToken?: DestinationTokenInfo;
  onSelect: (
    chainId: SUPPORTED_CHAINS_IDS,
    token: DestinationTokenInfo
  ) => void;
  disabled?: boolean;
  label?: string;
}

const DestinationAssetSelect: FC<DestinationAssetSelectProps> = ({
  selectedChain,
  selectedToken,
  onSelect,
  disabled,
  label = "To",
}) => {
  const [open, setOpen] = useState(false);
  const [tempChain, setTempChain] = useState<number | null>(null);

  const chains = useMemo(() => Array.from(DESTINATION_SWAP_TOKENS.keys()), []);
  const tokensForTempChain: DestinationTokenInfo[] = useMemo(() => {
    if (!tempChain) return [] as DestinationTokenInfo[];
    return DESTINATION_SWAP_TOKENS.get(tempChain) ?? [];
  }, [tempChain]);

  const handlePick = (tok: DestinationTokenInfo) => {
    if (!tempChain) return;
    onSelect(tempChain as SUPPORTED_CHAINS_IDS, tok);
    setOpen(false);
  };

  return (
    <div className="w-full">
      <p className="text-sm font-semibold mb-1">{label}</p>
      <Dialog open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedChain && selectedToken ? (
              <div className="flex items-center gap-x-3">
                <div className="relative">
                  <img
                    src={TOKEN_IMAGES[selectedToken?.symbol]}
                    alt={selectedToken.symbol}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <img
                    src={CHAIN_METADATA[selectedChain].logo}
                    alt={CHAIN_METADATA[selectedChain].name}
                    width={16}
                    height={16}
                    className="rounded-full absolute bottom-0 right-0 translate-x-1/3 translate-y-1/6"
                  />
                </div>

                <span className="text-sm font-medium">
                  {selectedToken.symbol} on {CHAIN_METADATA[selectedChain].name}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Select chain and token
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select destination asset</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-md p-2 max-h-80 overflow-y-auto">
              <p className="text-xs font-medium mb-2">Chains</p>
              <div className="flex flex-col gap-y-1">
                {chains.map((id) => {
                  const meta = CHAIN_METADATA[id as SUPPORTED_CHAINS_IDS];
                  return (
                    <Button
                      key={id}
                      type="button"
                      variant="ghost"
                      onClick={() => setTempChain(id)}
                      className={`flex items-center justify-start gap-x-2 p-2 rounded hover:bg-muted w-full ${
                        tempChain === id ? "bg-muted" : ""
                      }`}
                    >
                      <img
                        src={meta.logo}
                        alt={meta.name}
                        width={18}
                        height={18}
                        className="rounded-full"
                      />
                      <span className="text-sm">{meta.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="border rounded-md p-2 max-h-80 overflow-y-auto">
              <p className="text-xs font-medium mb-2">Tokens</p>
              <div className="flex flex-col gap-y-1">
                {tempChain ? (
                  tokensForTempChain.map((t) => (
                    <Button
                      key={t.symbol}
                      type="button"
                      variant="ghost"
                      onClick={() => handlePick(t)}
                      className="flex items-center justify-start gap-x-2 p-2 rounded hover:bg-muted w-full"
                    >
                      {t.logo ? (
                        <img
                          src={t.logo}
                          alt={t.symbol}
                          width={18}
                          height={18}
                          className="rounded-full"
                        />
                      ) : null}
                      <span className="text-sm">{t.symbol}</span>
                    </Button>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a chain
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DestinationAssetSelect;
