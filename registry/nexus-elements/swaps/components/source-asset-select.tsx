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
import { useNexus } from "../../nexus/NexusProvider";
import {
  CHAIN_METADATA,
  type SUPPORTED_CHAINS_IDS,
} from "@avail-project/nexus-core";
import { TOKEN_IMAGES } from "../config/destination";

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
  onSelect: (chainId: SUPPORTED_CHAINS_IDS, token: SourceTokenInfo) => void;
  disabled?: boolean;
  label?: string;
  children: ReactNode;
}

const SourceAssetSelect: FC<SourceAssetSelectProps> = ({
  selectedChain,
  selectedToken,
  onSelect,
  disabled,
  label = "From",
}) => {
  const { swapSupportedChainsAndTokens, unifiedBalance } = useNexus();
  const [open, setOpen] = useState(false);
  const [tempChain, setTempChain] = useState<number | null>(null);

  const chains = swapSupportedChainsAndTokens ?? [];

  const tokensForTempChain: SourceTokenInfo[] = useMemo(() => {
    if (!tempChain) return [] as SourceTokenInfo[];
    const balances = unifiedBalance ?? [];
    const tokens: SourceTokenInfo[] = [];

    for (const asset of balances) {
      if (!asset?.breakdown?.length) continue;
      const breakdownForChain = asset.breakdown.find(
        (b) => b.chain?.id === tempChain && Number.parseFloat(b.balance) > 0
      );
      if (!breakdownForChain) continue;

      tokens.push({
        contractAddress: breakdownForChain.contractAddress,
        decimals: breakdownForChain.decimals ?? asset.decimals,
        logo: TOKEN_IMAGES[asset.symbol] ?? "",
        name: asset.symbol,
        symbol: asset.symbol,
      });
    }

    const unique = new Map<string, SourceTokenInfo>();
    for (const t of tokens) {
      unique.set(t.contractAddress.toLowerCase(), t);
    }
    return Array.from(unique.values());
  }, [tempChain, unifiedBalance]);

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
          <Button
            variant="outline"
            className="w-full justify-between h-20"
            disabled={disabled}
          >
            {selectedChain && selectedToken ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col items-start">
                  <span className="text-lg font-semibold leading-tight">
                    {selectedToken.symbol}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {CHAIN_METADATA[selectedChain].name}
                  </span>
                </div>
                <div className="relative">
                  <img
                    src={TOKEN_IMAGES[selectedToken?.symbol]}
                    alt={selectedToken.symbol}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                  <img
                    src={CHAIN_METADATA[selectedChain].logo}
                    alt={CHAIN_METADATA[selectedChain].name}
                    width={18}
                    height={18}
                    className="rounded-full absolute bottom-0 right-0 translate-x-1/3 translate-y-1/6"
                  />
                </div>
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
            <DialogTitle>Select source asset</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-md p-2 max-h-80 overflow-y-auto">
              <p className="text-xs font-medium mb-2">Chains</p>
              <div className="flex flex-col items-start gap-y-1 w-full">
                {chains.map((c: any) => (
                  <Button
                    key={c.id}
                    variant={"ghost"}
                    onClick={() => setTempChain(c.id)}
                    className={`flex items-center justify-start w-full gap-x-2 p-2 rounded hover:bg-muted ${
                      tempChain === c.id ? "bg-muted" : ""
                    }`}
                  >
                    <img
                      src={c.logo}
                      alt={c.name}
                      width={18}
                      height={18}
                      className="rounded-full"
                    />
                    <span className="text-sm">{c.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="border rounded-md p-2 max-h-80 overflow-y-auto">
              <p className="text-xs font-medium mb-2">Tokens</p>
              <div className="flex flex-col items-start gap-y-1 w-full">
                {tempChain && tokensForTempChain ? (
                  tokensForTempChain?.map((t) => (
                    <Button
                      key={t.symbol}
                      variant={"ghost"}
                      onClick={() => handlePick(t)}
                      className="flex items-center justify-start w-full gap-x-2 p-2 rounded hover:bg-muted"
                    >
                      {t.symbol ? (
                        <img
                          src={TOKEN_IMAGES[t.symbol]}
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

export default SourceAssetSelect;
