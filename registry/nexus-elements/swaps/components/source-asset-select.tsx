"use client";
import { type FC, useMemo, useState } from "react";
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
  type UserAsset,
  type SUPPORTED_CHAINS_IDS,
} from "@avail-project/nexus-core";
import { TOKEN_IMAGES } from "../config/destination";
import { Loader2 } from "lucide-react";

type SourceTokenInfo = {
  contractAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
  balance?: string;
  chainId?: number;
};

interface SourceAssetSelectProps {
  selectedChain?: SUPPORTED_CHAINS_IDS;
  selectedToken?: SourceTokenInfo;
  onSelect: (chainId: SUPPORTED_CHAINS_IDS, token: SourceTokenInfo) => void;
  disabled?: boolean;
  label?: string;
  swapBalance: UserAsset[] | null;
}

const SourceAssetSelect: FC<SourceAssetSelectProps> = ({
  selectedChain,
  selectedToken,
  onSelect,
  disabled,
  label = "From",
  swapBalance,
}) => {
  const { swapSupportedChainsAndTokens, nexusSDK } = useNexus();
  const [open, setOpen] = useState(false);
  const [tempChain, setTempChain] = useState<number | null>(null);

  // Get all tokens from swapBalance with their chain info
  const allTokens: SourceTokenInfo[] = useMemo(() => {
    if (!swapBalance) return [];
    const tokens: SourceTokenInfo[] = [];

    for (const asset of swapBalance) {
      if (!asset?.breakdown?.length) continue;
      for (const breakdown of asset.breakdown) {
        if (Number.parseFloat(breakdown.balance) <= 0) continue;

        tokens.push({
          contractAddress: breakdown.contractAddress,
          decimals: breakdown.decimals ?? asset.decimals,
          logo: TOKEN_IMAGES[asset.symbol] ?? "",
          name: asset.symbol,
          symbol: asset.symbol,
          balance: nexusSDK?.utils?.formatTokenBalance(breakdown?.balance, {
            symbol: asset.symbol,
            decimals: asset.decimals,
          }),
          chainId: breakdown.chain?.id,
        });
      }
    }

    // Dedupe by contractAddress + chainId
    const unique = new Map<string, SourceTokenInfo>();
    for (const t of tokens) {
      const key = `${t.contractAddress.toLowerCase()}-${t.chainId}`;
      unique.set(key, t);
    }
    return Array.from(unique.values());
  }, [swapBalance, nexusSDK]);

  // Only show chains that have tokens with balance
  const chainsWithTokens = useMemo(() => {
    if (!swapSupportedChainsAndTokens || !allTokens.length) return [];
    const chainIdsWithTokens = new Set(allTokens.map((t) => t.chainId));
    return swapSupportedChainsAndTokens.filter((c) =>
      chainIdsWithTokens.has(c.id)
    );
  }, [swapSupportedChainsAndTokens, allTokens]);

  // Filter tokens by selected chain, or show all if no chain selected
  const displayedTokens: SourceTokenInfo[] = useMemo(() => {
    if (!tempChain) return allTokens;
    return allTokens.filter((t) => t.chainId === tempChain);
  }, [tempChain, allTokens]);

  const handlePick = (tok: SourceTokenInfo) => {
    const chainId = tempChain ?? tok.chainId;
    if (!chainId) return;
    onSelect(chainId as SUPPORTED_CHAINS_IDS, tok);
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
            <DialogTitle>Select source asset</DialogTitle>
          </DialogHeader>
          {swapBalance && (
            <div className="grid grid-cols-2 gap-4 no-scrollbar">
              <div className="border rounded-md p-2 max-h-80 overflow-y-auto">
                <p className="text-xs font-medium mb-2">Chains</p>
                <div className="flex flex-col items-center sm:items-start gap-y-1 w-full">
                  <Button
                    variant={"ghost"}
                    onClick={() => setTempChain(null)}
                    className={`flex items-center justify-start w-full gap-x-2 p-2 rounded hover:bg-muted ${
                      tempChain === null ? "bg-muted" : ""
                    }`}
                  >
                    <span className="text-sm">All Chains</span>
                  </Button>
                  {chainsWithTokens.map((c) => (
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
                <div className="flex flex-col items-center sm:items-start gap-y-1 w-full  no-scrollbar">
                  {displayedTokens.length > 0 ? (
                    displayedTokens.map((t) => (
                      <Button
                        key={`${t.contractAddress}-${t.chainId}`}
                        variant={"ghost"}
                        onClick={() => handlePick(t)}
                        className="flex items-center justify-between gap-x-2 p-2 rounded hover:bg-muted w-full"
                      >
                        <div className="flex items-center gap-x-2">
                          {t.symbol ? (
                            <div className="relative">
                              <img
                                src={TOKEN_IMAGES[t.symbol]}
                                alt={t.symbol}
                                width={18}
                                height={18}
                                className="rounded-full"
                              />
                              {!tempChain && t.chainId && (
                                <img
                                  src={
                                    CHAIN_METADATA[
                                      t.chainId as SUPPORTED_CHAINS_IDS
                                    ]?.logo
                                  }
                                  alt=""
                                  width={10}
                                  height={10}
                                  className="rounded-full absolute bottom-0 right-0 translate-x-1/3 translate-y-1/6"
                                />
                              )}
                            </div>
                          ) : null}
                          <p className="text-sm text-foreground">{t.symbol}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.balance}
                        </p>
                      </Button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No Tokens Found
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {!swapBalance && (
            <div className="flex flex-col items-center justify-center gap-y-3">
              <p className="text-sm text-muted-foreground">
                Fetching swappable assets
              </p>
              <Loader2 className="animate-spin size-5" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SourceAssetSelect;
