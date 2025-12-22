"use client";

import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { TokenIcon } from "./token-icon";
import { MOCK_WALLET_BALANCE } from "../constants";
import { ErrorBanner } from "./ui/error-banner";
import { AnimatedAmount } from "./animated-amount";
import { PercentageSelector } from "./percentage-selector";
import { formatCurrency, parseCurrencyInput } from "../utils";

interface AmountCardProps {
  amount?: string;
  onAmountChange?: (amount: string) => void;
  selectedTokenAmount?: number;
  onErrorStateChange?: (hasError: boolean) => void;
}

function AmountCard({
  amount: externalAmount,
  onAmountChange,
  selectedTokenAmount = 0,
  onErrorStateChange,
}: AmountCardProps) {
  const [internalAmount, setInternalAmount] = useState("");
  const amount = externalAmount ?? internalAmount;
  const setAmount = onAmountChange ?? setInternalAmount;

  const [inputWidth, setInputWidth] = useState(0);
  const measureRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track previous amount for animation direction
  const [previousAmount, setPreviousAmount] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);

  const displayValue = amount ? `$${amount}` : "";
  const measureText = displayValue || "$0";

  // Check if amount exceeds wallet balance
  const exceedsBalance = useMemo(() => {
    if (!amount) return false;
    const numericAmount = parseFloat(amount.replace(/,/g, ""));
    return !isNaN(numericAmount) && numericAmount > MOCK_WALLET_BALANCE;
  }, [amount]);

  // Check if amount exceeds selected token amount but is within wallet balance
  const exceedsSelectedTokens = useMemo(() => {
    if (!amount || selectedTokenAmount === 0) return false;
    const numericAmount = parseFloat(amount.replace(/,/g, ""));
    return (
      !isNaN(numericAmount) &&
      numericAmount > selectedTokenAmount &&
      numericAmount <= MOCK_WALLET_BALANCE
    );
  }, [amount, selectedTokenAmount]);

  useEffect(() => {
    if (measureRef.current) {
      setInputWidth(measureRef.current.offsetWidth);
    }
  }, [measureText]);

  // Notify parent of error state changes
  useEffect(() => {
    const hasError = exceedsBalance || exceedsSelectedTokens;
    onErrorStateChange?.(hasError);
  }, [exceedsBalance, exceedsSelectedTokens, onErrorStateChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = parseCurrencyInput(e.target.value);

      // Validate numeric input (allow unlimited decimals)
      if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
        setIsAnimating(false);
        setUserInteracted(true);
        setAmount(rawValue);
      }
    },
    [setAmount]
  );

  const handlePercentageClick = useCallback(
    (percentage: number) => {
      const calculatedAmount = MOCK_WALLET_BALANCE * percentage;
      const newAmount = formatCurrency(calculatedAmount);

      // Store previous amount and trigger animation
      setPreviousAmount(amount || "0");
      setIsAnimating(true);
      setUserInteracted(false);
      setAnimationKey((prev) => prev + 1);
      setAmount(newAmount);

      // Clear animation much faster to allow immediate editing
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    },
    [setAmount, amount]
  );

  const handleInputFocus = useCallback(() => {
    setIsAnimating(false);
    setUserInteracted(true);
  }, []);

  const handleInputClick = useCallback(() => {
    setIsAnimating(false);
    setUserInteracted(true);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setIsAnimating(false);
    setUserInteracted(true);
    // Select all text on double click
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, []);

  // Handle keyboard shortcuts like Ctrl+A
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        setIsAnimating(false);
        setUserInteracted(true);
        if (inputRef.current) {
          inputRef.current.select();
        }
      }
    },
    []
  );

  return (
    <div className="py-8 min-h-[212px] w-full border bg-base text-muted-foreground shadow-[0_1px_12px_0_rgba(91,91,91,0.05)]">
      {/* Hidden span to measure text width */}
      <span
        ref={measureRef}
        className="absolute invisible whitespace-pre font-display text-[32px] font-medium tracking-[0.8px]"
        aria-hidden="true"
      >
        {measureText}
      </span>

      {/* Amount Input Section */}
      <div className="mt-1.5 w-full flex items-center justify-center gap-3">
        <TokenIcon
          tokenSrc="/usdc.svg"
          protocolSrc="/aave.svg"
          tokenAlt="USDC"
        />
        <div className="relative">
          {/* Animated display layer - shown when animating from button click */}
          {isAnimating && !userInteracted && displayValue && (
            <div className="absolute inset-0">
              <AnimatedAmount
                key={animationKey}
                value={displayValue}
                previousValue={`$${previousAmount}`}
                className={`font-display text-[32px] font-medium tracking-[0.8px] whitespace-nowrap ${
                  amount ? "text-card-foreground" : "text-muted-foreground"
                }`}
              />
            </div>
          )}
          {/* Input layer */}
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onClick={handleInputClick}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            placeholder="$0"
            style={{
              width: inputWidth > 0 ? Math.min(inputWidth + 4, 300) : undefined,
              maxWidth: "calc(100vw - 100px)",
            }}
            className={`font-display text-[32px] font-medium tracking-[0.8px] bg-transparent border-none outline-none min-w-[40px] ${
              isAnimating && !userInteracted ? "opacity-0" : ""
            } ${
              amount ? "text-card-foreground" : "text-muted-foreground"
            } placeholder:text-muted-foreground`}
          />
        </div>
      </div>

      {/* Percentage Selector */}
      <PercentageSelector onPercentageClick={handlePercentageClick} />

      {/* Balance Display */}
      <div className="mt-8.5 font-sans text-[13px] leading-4.5 text-muted-foreground text-center">
        Balance: ${formatCurrency(MOCK_WALLET_BALANCE)}
      </div>

      {/* Error Banner */}
      {exceedsBalance && (
        <div className="mt-4 mx-4">
          <ErrorBanner message="You don't have enough wallet balance." />
        </div>
      )}
      {exceedsSelectedTokens && (
        <div className="mt-4 mx-4">
          <ErrorBanner message="Amount exceeds your selected token balance. Select more tokens or reduce amount to continue." />
        </div>
      )}
    </div>
  );
}

export default AmountCard;
