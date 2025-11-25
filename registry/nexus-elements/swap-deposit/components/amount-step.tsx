"use client";

import { useState, useCallback } from "react";
import { DepositHeader } from "./deposit-header";
import { TokenIcon } from "./token-icon";
import { Button } from "../../ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const PERCENTAGES = [25, 50, 75, 100] as const;

export interface AmountStepToken {
  symbol: string;
  maxAmount: number;
  readableBalance: string;
  tokenLogo?: string;
  chainLogo?: string;
  receiveSymbol?: string;
  receiveTokenLogo?: string;
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
  const [amount, setAmount] = useState<string>("");
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null);
  const receiveSymbol = token.receiveSymbol ?? "USDC";

  const handlePercentClick = useCallback(
    (percent: number) => {
      setSelectedPercent(percent);
      const computed =
        percent === 100
          ? token.maxAmount
          : (token.maxAmount * percent) / 100;
      setAmount(computed.toFixed(6));
    },
    [token.maxAmount]
  );

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "");
    setAmount(numericValue);
    setSelectedPercent(null);
  };

  const numericAmount = Number.parseFloat(amount) || 0;
  const receiveAmount = numericAmount;
  const isDisabled =
    numericAmount <= 0 ||
    Number.isNaN(numericAmount) ||
    numericAmount > token.maxAmount;

  return (
    <div className="flex h-full flex-col bg-background">
      <DepositHeader title={title} onBack={onBack} onClose={onClose} showClose />

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <div className="relative w-full max-w-xs text-center">
          <div className="flex items-center justify-center text-foreground">
            <span className="text-5xl font-light">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => handleAmountChange(event.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-5xl font-light text-foreground outline-none placeholder:text-muted-foreground text-center"
            />
          </div>
          <div className="absolute -right-1 top-0 bottom-0 w-0.5 bg-foreground/70 animate-pulse" />
          <p className="mt-2 text-xs text-muted-foreground">
            Balance: {token.readableBalance}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>≈</span>
          <span>
            {receiveAmount.toFixed(6)} {receiveSymbol}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {PERCENTAGES.map((percent) => (
            <Button
              key={percent}
              variant="secondary"
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

      <div className="space-y-4 border-t border-border p-4">
        <div className="flex items-center justify-center gap-3 rounded-full bg-secondary/60 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <TokenIcon
              symbol={token.symbol}
              tokenLogo={token.tokenLogo}
              chainLogo={token.chainLogo}
              size="sm"
            />
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
              size="sm"
            />
            <div>
              <p className="text-muted-foreground text-xs">You receive</p>
              <p className="font-medium text-foreground">{receiveSymbol}</p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => onContinue(numericAmount)}
          disabled={isDisabled}
          className="h-12 w-full rounded-xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

