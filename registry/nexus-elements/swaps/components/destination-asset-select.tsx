"use client";
import { type FC, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import {
  type SUPPORTED_CHAINS_IDS,
  CHAIN_METADATA,
  type UserAsset,
} from "@avail-project/nexus-core";
import { DESTINATION_SWAP_TOKENS } from "../config/destination";
import { DialogClose } from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "../../ui/select";
import { Link2, Search } from "lucide-react";
import { SHORT_CHAIN_NAME, usdFormatter } from "../../common";
import { TokenIcon } from "./token-icon";
import { useNexus } from "../../nexus/NexusProvider";
import { type DestinationTokenInfo } from "../hooks/useExactIn";

interface DestinationAssetSelectProps {
  swapBalance: UserAsset[] | null;
  onSelect: (
    chainId: SUPPORTED_CHAINS_IDS,
    token: DestinationTokenInfo,
  ) => void;
}

const DestinationAssetSelect: FC<DestinationAssetSelectProps> = ({
  swapBalance,
  onSelect,
}) => {
  const { nexusSDK } = useNexus();
  const [tempChain, setTempChain] = useState<number | null>(null);

  // Get all tokens from all chains with their chain info
  const allTokens: DestinationTokenInfo[] = useMemo(() => {
    const tokens: DestinationTokenInfo[] = [];
    for (const [chainId, chainTokens] of DESTINATION_SWAP_TOKENS.entries()) {
      for (const token of chainTokens) {
        tokens.push({
          ...token,
          chainId,
        });
      }
    }
    return tokens.map((token) => {
      const balance = swapBalance
        ?.find((t) => t.symbol === token.symbol)
        ?.breakdown?.find((chain) => chain.chain?.id === token.chainId);
      return {
        ...token,
        balance: nexusSDK?.utils?.formatTokenBalance(balance?.balance ?? "0", {
          symbol: token.symbol,
          decimals: balance?.decimals ?? 0,
        }),
        balanceInFiat: usdFormatter.format(balance?.balanceInFiat ?? 0),
      };
    });
  }, [swapBalance]);

  // Only show chains that have tokens
  const chainsWithTokens = useMemo(() => {
    return Array.from(DESTINATION_SWAP_TOKENS.keys());
  }, []);

  // Filter tokens by selected chain, or show all if no chain selected
  const displayedTokens: DestinationTokenInfo[] = useMemo(() => {
    if (!tempChain) return allTokens;
    return allTokens.filter((t) => t.chainId === tempChain);
  }, [tempChain, allTokens]);

  const handlePick = (tok: DestinationTokenInfo) => {
    const chainId = tempChain ?? tok.chainId;
    if (!chainId) return;
    onSelect(chainId as SUPPORTED_CHAINS_IDS, tok);
  };

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-y-3">
        <Select
          value={tempChain ? CHAIN_METADATA[tempChain].name : ""}
          onValueChange={(value) => {
            const matchedChain = chainsWithTokens.find(
              (chain) => String(chain) === value,
            );
            if (matchedChain) {
              setTempChain(matchedChain);
            }
          }}
        >
          <div className="flex bg-input/30 w-full px-2">
            <div className="flex items-center gap-x-2 w-full justify-between">
              <Search className="size-5 opacity-65" />
              <input
                placeholder="Search"
                className="bg-transparent w-full text-foreground text-base font-medium outline-none transition-all duration-150 placeholder-muted-foreground proportional-nums disabled:opacity-80"
              />
            </div>
            <SelectTrigger className="rounded-full border-none cursor-pointer bg-transparent!">
              {tempChain ? (
                <img
                  src={CHAIN_METADATA[tempChain].logo}
                  alt={CHAIN_METADATA[tempChain].name}
                  width={24}
                  height={24}
                  className="rounded-full size-6"
                />
              ) : (
                <div className="size-8 rounded-full flex items-center justify-center border border-border">
                  <Link2 className="size-4" />
                </div>
              )}
            </SelectTrigger>
          </div>
          <SelectContent>
            <SelectGroup>
              {chainsWithTokens.map((c) => (
                <SelectItem key={c} value={String(c)}>
                  <div className="flex items-center justify-between gap-x-2">
                    <img
                      src={CHAIN_METADATA[c].logo}
                      alt={CHAIN_METADATA[c].name}
                      width={20}
                      height={20}
                      className="rounded-full size-5"
                    />
                    <span className="text-sm">{CHAIN_METADATA[c].name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-sm">
          {tempChain
            ? `Tokens on ${SHORT_CHAIN_NAME[tempChain]}`
            : "All Tokens"}
        </p>
        <div className="rounded-md px-2 max-h-80 overflow-y-auto no-scrollbar">
          <div className="flex flex-col items-center sm:items-start gap-y-4 w-full no-scrollbar">
            {displayedTokens.length > 0 ? (
              displayedTokens.map((t) => (
                <DialogClose asChild key={`${t.tokenAddress}-${t.chainId}`}>
                  <Button
                    variant={"ghost"}
                    onClick={() => handlePick(t)}
                    className="flex items-center justify-between gap-x-2 p-2 rounded w-full h-max"
                  >
                    <div className="flex items-center gap-x-2">
                      {t.symbol ? (
                        <div className="relative">
                          <TokenIcon
                            symbol={t.symbol}
                            tokenLogo={t.logo}
                            chainLogo={CHAIN_METADATA[t.chainId ?? 1]?.logo}
                            className="border border-border rounded-full"
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-base text-foreground">{t.balance}</p>
                      <p className="text-sm text-muted-foreground">
                        {t.balanceInFiat}
                      </p>
                    </div>
                  </Button>
                </DialogClose>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No Tokens Found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationAssetSelect;
