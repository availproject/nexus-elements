"use client";
import { type FC, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import {
  type SUPPORTED_CHAINS_IDS,
  CHAIN_METADATA,
} from "@avail-project/nexus-core";
import { DESTINATION_SWAP_TOKENS, TOKEN_IMAGES } from "../config/destination";
import { DialogClose } from "../../ui/dialog";

type DestinationTokenInfo = {
  tokenAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
  chainId?: number;
};

interface DestinationAssetSelectProps {
  onSelect: (
    chainId: SUPPORTED_CHAINS_IDS,
    token: DestinationTokenInfo,
  ) => void;
}

const DestinationAssetSelect: FC<DestinationAssetSelectProps> = ({
  onSelect,
}) => {
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
    return tokens;
  }, []);

  // Only show chains that have tokens
  const chainsWithTokens = useMemo(() => {
    return Array.from(DESTINATION_SWAP_TOKENS.keys()).filter(
      (chainId) => (DESTINATION_SWAP_TOKENS.get(chainId)?.length ?? 0) > 0,
    );
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
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-md p-2 max-h-80 overflow-y-auto">
          <p className="text-xs font-medium mb-2">Chains</p>
          <div className="flex flex-col gap-y-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTempChain(null)}
              className={`flex items-center justify-start gap-x-2 p-2 rounded hover:bg-muted w-full ${
                tempChain === null ? "bg-muted" : ""
              }`}
            >
              <span className="text-sm">All Chains</span>
            </Button>
            {chainsWithTokens.map((id) => {
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
            {displayedTokens.length > 0 ? (
              displayedTokens.map((t) => (
                <DialogClose asChild key={`${t.tokenAddress}-${t.chainId}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handlePick(t)}
                    className="flex items-center justify-start gap-x-2 p-2 rounded hover:bg-muted w-full"
                  >
                    <div className="relative">
                      {t.logo ? (
                        <img
                          src={t.logo}
                          alt={t.symbol}
                          width={18}
                          height={18}
                          className="rounded-full"
                        />
                      ) : null}
                      {!tempChain && t.chainId && (
                        <img
                          src={
                            CHAIN_METADATA[t.chainId as SUPPORTED_CHAINS_IDS]
                              ?.logo
                          }
                          alt=""
                          width={10}
                          height={10}
                          className="rounded-full absolute bottom-0 right-0 translate-x-1/3 translate-y-1/6"
                        />
                      )}
                    </div>
                    <span className="text-sm">{t.symbol}</span>
                  </Button>
                </DialogClose>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                No tokens available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationAssetSelect;
