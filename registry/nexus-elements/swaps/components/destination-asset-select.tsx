"use client";
import { type FC, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { type TokenBalance } from "@avail-project/nexus-sdk-v2";
import { formatTokenBalance } from "@avail-project/nexus-sdk-v2/utils";
import { DESTINATION_SWAP_TOKENS } from "../config/destination";
import { DialogClose } from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "../../ui/select";
import { Link2, Search, X } from "lucide-react";
import { SHORT_CHAIN_NAME, usdFormatter } from "../../common";
import { TokenIcon } from "./token-icon";
import { useNexus } from "../../nexus/NexusProvider";
import { type DestinationTokenInfo } from "../hooks/useSwaps";

interface DestinationAssetSelectProps {
  swapBalance: TokenBalance[] | null;
  onSelect: (
    chainId: number,
    token: DestinationTokenInfo,
  ) => void;
}

const DestinationAssetSelect: FC<DestinationAssetSelectProps> = ({
  swapBalance,
  onSelect,
}) => {
  const { nexusSDK, supportedChainsAndTokens } = useNexus();
  const [tempChain, setTempChain] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // v2: look up chain name/logo from supportedChainsAndTokens instead of CHAIN_METADATA
  const chainMetaById = useMemo(() => {
    const map = new Map<number, { name: string; logo: string }>();
    (supportedChainsAndTokens ?? []).forEach((chain) => {
      map.set(chain.id, { name: chain.name, logo: chain.logo ?? "" });
    });
    return map;
  }, [supportedChainsAndTokens]);
  const getChainMeta = (id?: number | null) =>
    id != null ? chainMetaById.get(id) ?? { name: "Chain "+id, logo: "" } : { name: "", logo: "" };

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
      // v2: chainBalances replaces breakdown; value is a string USD amount
      const balance = swapBalance
        ?.flatMap((asset) => asset.chainBalances ?? [])
        ?.find(
          (chain) =>
            chain.symbol.toUpperCase() === token.symbol.toUpperCase() &&
            chain.chain?.id === token.chainId,
        );
      return {
        ...token,
        balance: formatTokenBalance(balance?.balance ?? "0", {
          symbol: balance?.symbol ?? token.symbol,
          decimals: balance?.decimals ?? 0,
        }),
        balanceInFiat: usdFormatter.format(
          Number.parseFloat(balance?.value ?? "0"),
        ),
      };
    });
  }, [swapBalance]);

  // Only show chains that have tokens
  const chainsWithTokens = useMemo(() => {
    return Array.from(DESTINATION_SWAP_TOKENS.keys());
  }, []);

  // Filter tokens by selected chain and search query
  const displayedTokens: DestinationTokenInfo[] = useMemo(() => {
    let filtered = allTokens;

    // Filter by chain
    if (tempChain) {
      filtered = filtered.filter((t) => t.chainId === tempChain);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.symbol.toLowerCase().includes(query) ||
          t.name.toLowerCase().includes(query) ||
          t.tokenAddress.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [tempChain, allTokens, searchQuery]);

  const handlePick = (tok: DestinationTokenInfo) => {
    const chainId = tempChain ?? tok.chainId;
    if (!chainId) return;
    onSelect(chainId, tok);
  };

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-y-3">
          <Select
          value={tempChain ? getChainMeta(tempChain).name : ""}
          onValueChange={(value) => {
            const matchedChain = chainsWithTokens.find(
              (chain: any) => String((chain as any).id) === value,
            );
            if (matchedChain) {
              setTempChain(matchedChain);
            }
          }}
        >
          <div className="flex bg-input/30 w-full px-2 py-1.5">
            <div className="flex items-center gap-x-2 w-full justify-between">
              <Search className="size-5 opacity-65" />
              <input
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent w-full text-foreground text-base font-medium outline-none transition-all duration-150 placeholder-muted-foreground proportional-nums disabled:opacity-80"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="size-4 opacity-65" />
                </button>
              )}
            </div>
            <SelectTrigger className="rounded-full border-none cursor-pointer bg-transparent!">
              {tempChain ? (
                <img
                  src={getChainMeta(tempChain).logo || undefined}
                  alt={getChainMeta(tempChain).name}
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
                      src={getChainMeta(c).logo || undefined}
                      alt={getChainMeta(c).name}
                      width={20}
                      height={20}
                      className="rounded-full size-5"
                    />
                    <span className="text-sm">{getChainMeta(c).name}</span>
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
                            chainLogo={getChainMeta(t.chainId ?? 1).logo || undefined}
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
