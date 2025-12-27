"use client";

import Image from "next/image";
import { Checkbox } from "./ui/checkbox";
import { ChevronDownIcon } from "./icons";
import type { Token } from "../types";
import { getTokenCheckState } from "../utils/asset-helpers";

const CHAIN_ITEM_HEIGHT = 49;
const VERTICAL_LINE_TOP_OFFSET = 48;

interface TokenRowProps {
  token: Token;
  selectedChainIds: Set<string>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleToken: () => void;
  onToggleChain: (chainId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function TokenRow({
  token,
  selectedChainIds,
  isExpanded,
  onToggleExpand,
  onToggleToken,
  onToggleChain,
  isFirst = false,
  isLast = false,
}: TokenRowProps) {
  const hasMultipleChains = token.chains.length > 1;
  const tokenCheckState = getTokenCheckState(token, selectedChainIds);

  return (
    <div
      className={`border-b bg-base relative ${isFirst ? "rounded-t-lg" : ""} ${
        isLast ? "rounded-b-lg border-b-0" : ""
      }`}
    >
      {/* Main token row */}
      <div
        className="p-5 flex justify-between items-center cursor-pointer"
        onClick={hasMultipleChains ? onToggleExpand : undefined}
      >
        <div className="flex gap-6 items-center">
          <Checkbox
            checked={tokenCheckState}
            onCheckedChange={onToggleToken}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex items-center gap-3">
            <Image
              src={token.logo}
              alt={token.symbol}
              width={24}
              height={24}
              className="rounded-full"
            />
            <div className="flex flex-col gap-1">
              <span className="font-display font-medium text-sm leading-4.5 text-card-foreground">
                {token.symbol}
              </span>
              <span className="font-sans text-[13px] text-muted-foreground leading-4.5">
                {token.chainsLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex flex-col gap-1 items-end">
            <span className="text-[13px] leading-4.5 text-muted-foreground">
              {token.usdValue}
            </span>
            <span className="text-[13px] leading-4.5 text-muted-foreground">
              {token.amount}
            </span>
          </div>
          {hasMultipleChains ? (
            <ChevronDownIcon
              className={`text-muted-foreground transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          ) : (
            <div className="w-4 h-4"></div>
          )}
        </div>
      </div>

      {/* Expanded chain list */}
      {isExpanded && hasMultipleChains && (
        <div className="pl-5 pb-4 w-full">
          <div className="w-full">
            {/* Vertical line */}
            <div
              className="bg-border shrink-0 absolute left-[26.5px] w-0.5"
              style={{
                top: `${VERTICAL_LINE_TOP_OFFSET}px`,
                height: `${token.chains.length * CHAIN_ITEM_HEIGHT + 8.5}px`,
              }}
            />
            {/* Chain items */}
            <div className="flex flex-col">
              {token.chains.map((chain) => (
                <div
                  key={chain.id}
                  className="flex items-center"
                  style={{ height: `${CHAIN_ITEM_HEIGHT}px` }}
                >
                  {/* Horizontal line */}
                  <div className="bg-border shrink-0 ml-2 w-[37px] h-0.5" />
                  {/* Chain content */}
                  <div className="flex items-center justify-between flex-1 pr-5">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedChainIds.has(chain.id)}
                        onCheckedChange={() => onToggleChain(chain.id)}
                      />
                      <span className="font-sans text-sm leading-4.5 text-card-foreground">
                        {chain.name}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 items-end mr-8">
                      <span className="text-[13px] leading-4.5 text-muted-foreground">
                        {chain.usdValue}
                      </span>
                      <span className="text-[13px] leading-4.5 text-muted-foreground">
                        {chain.amount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TokenRow;
