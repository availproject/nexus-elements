"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DepositHeader } from "./deposit-header";
import { TokenIcon } from "./token-icon";
import { Button } from "../../ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useNexus } from "../../nexus/NexusProvider";
import { CHAIN_METADATA } from "@avail-project/nexus-core";
import { type AssetSelection } from "./asset-select";

const PERCENTAGES = [25, 50, 75, 100];

export interface AmountStepToken {
  symbol: string;
  maxAmount: number;
  readableBalance: string;
  sources?: AssetSelection[];
  receiveSymbol?: string;
  receiveTokenLogo?: string;
  receiveTokenDecimals?: number;
  receiveChainId: number;
}

interface AmountStepProps {
  token: AmountStepToken;
  onContinue: (amount: number) => void;
  onBack: () => void;
  onClose: () => void;
  title?: string;
}

export const AmountStep = ({
  token,
  onContinue,
  onBack,
  onClose,
  title = "Deposit USDC",
}: AmountStepProps) => {
  const { getFiatValue } = useNexus();
  const [amount, setAmount] = useState<string>("");
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null);
  const receiveSymbol = token.receiveSymbol ?? "USDC";
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mirrorRef.current && inputRef.current) {
      const inputWidth = mirrorRef.current.offsetWidth;
      inputRef.current.style.width = `${Math.max(inputWidth + 8, 24)}px`;
    }
  }, [amount]);

  const handlePercentClick = useCallback(
    (percent: number) => {
      setSelectedPercent(percent);
      const computed =
        percent === 100 ? token.maxAmount : (token.maxAmount * percent) / 100;
      setAmount(computed.toFixed(token.receiveTokenDecimals));
    },
    [token.maxAmount]
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numericValue = inputValue.replaceAll(/[^0-9.]/g, "");
    setAmount(numericValue);
    setSelectedPercent(null);
  };

  const receiveAmount = Number.parseFloat(amount) || 0;
  const isDisabled =
    receiveAmount <= 0 ||
    Number.isNaN(receiveAmount) ||
    receiveAmount > token.maxAmount;

  return (
    <div className="flex h-full flex-col bg-background">
      <DepositHeader
        title={title}
        onBack={onBack}
        onClose={onClose}
        showClose
      />

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <div className="relative w-full max-w-xs text-center flex flex-col gap-y-2 items-center justify-center">
          <div className="flex items-baseline gap-2 text-5xl font-medium transition-all duration-150 ease-out w-fit">
            <div className="text-foreground font-medium whitespace-nowrap">
              $
            </div>
            <div className="relative flex items-baseline">
              <div
                ref={mirrorRef}
                className="absolute invisible pointer-events-none text-5xl font-medium whitespace-pre"
                style={{
                  fontVariantNumeric: "proportional-nums",
                }}
              >
                {amount || "0"}
              </div>

              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                autoFocus
                className="bg-transparent text-foreground text-5xl font-medium outline-none transition-all duration-150 placeholder-muted-foreground"
                style={{
                  fontVariantNumeric: "proportional-nums",
                  width: "24px",
                }}
                maxLength={6}
              />
              <div className="absolute -inset-1 -z-10 blur-sm pointer-events-none opacity-0" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Balance: ${token.maxAmount.toFixed(4)}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>≈</span>
          <span>
            {getFiatValue(receiveAmount, receiveSymbol)} {receiveSymbol}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {PERCENTAGES.map((percent) => (
            <Button
              key={percent}
              variant="ghost"
              size="sm"
              onClick={() => handlePercentClick(percent)}
              className={cn(
                "rounded-lg px-4 text-sm",
                selectedPercent === percent
                  ? "bg-secondary text-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-secondary"
              )}
            >
              {percent === 100 ? "Max" : `${percent}%`}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-center justify-center gap-3 px-4 py-2 border border-border rounded-full w-max mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <div className="max-w-40 overflow-x-scroll no-scrollbar flex items-center">
              {token.sources?.map((source, index) => (
                <TokenIcon
                  key={source.tokenAddress}
                  symbol={source.symbol}
                  tokenLogo={source.tokenLogo}
                  chainLogo={source.chainLogo}
                  size="sm"
                  className={cn(
                    "last:mr-0 size-6",
                    index !== (token.sources?.length ?? 0) - 1 &&
                      token?.sources?.length &&
                      token.sources.length > 5
                      ? "-mr-5"
                      : "-mr-3"
                  )}
                />
              ))}
            </div>

            <div>
              <p className="text-muted-foreground text-xs">You send</p>
              <p className="font-medium text-foreground">{token.symbol}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 text-sm">
            <TokenIcon
              symbol={receiveSymbol}
              tokenLogo={token.receiveTokenLogo}
              chainLogo={CHAIN_METADATA[token.receiveChainId].logo}
              size="sm"
            />
            <div>
              <p className="text-muted-foreground text-xs">You receive</p>
              <p className="font-medium text-foreground">{receiveSymbol}</p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => onContinue(receiveAmount)}
          disabled={isDisabled}
          className="w-full rounded-xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
