"use client";

import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { TokenIcon } from "./token-icon";
import { MOCK_WALLET_BALANCE } from "../constants";
import { ErrorBanner } from "./ui/error-banner";

const PERCENTAGE_OPTIONS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "MAX", value: 1 },
] as const;

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrencyInput(input: string): string {
  // Remove $ and commas, keep only numbers and decimal
  return input.replace(/[^0-9.]/g, "");
}

// Determine animation direction for a single character
function getCharDirection(
  prevChar: string | undefined,
  currChar: string
): "up" | "down" | "none" {
  // Non-digit characters (like $, comma, period) don't animate
  if (!/\d/.test(currChar)) return "none";

  // New digit that didn't exist before - animate up
  if (prevChar === undefined) return "up";

  // Previous wasn't a digit - animate based on new value
  if (!/\d/.test(prevChar)) return "up";

  const prev = parseInt(prevChar, 10);
  const curr = parseInt(currChar, 10);

  if (curr > prev) return "up";
  if (curr < prev) return "down";
  return "none";
}

// Animated digit component for scroll effect
interface AnimatedDigitProps {
  char: string;
  direction: "up" | "down" | "none";
  delay: number;
}

function AnimatedDigit({ char, direction, delay }: AnimatedDigitProps) {
  const animationClass =
    direction === "up"
      ? "animate-digit-up"
      : direction === "down"
      ? "animate-digit-down"
      : "";

  return (
    <span
      className={`inline-block ${animationClass}`}
      style={{
        animationDelay: direction !== "none" ? `${delay}ms` : undefined,
        animationFillMode: "both",
      }}
    >
      {char}
    </span>
  );
}

// Align strings from decimal point for proper digit comparison
function alignStringsForComparison(
  prev: string,
  curr: string
): { prevAligned: string[]; currAligned: string[] } {
  // Extract parts before and after decimal
  const [prevInt, prevDec = ""] = prev.replace(/[^0-9.]/g, "").split(".");
  const [currInt, currDec = ""] = curr.replace(/[^0-9.]/g, "").split(".");

  // Pad integer parts from the left
  const maxIntLen = Math.max(prevInt.length, currInt.length);
  const prevIntPadded = prevInt.padStart(maxIntLen, " ");
  const currIntPadded = currInt.padStart(maxIntLen, " ");

  // Pad decimal parts from the right
  const maxDecLen = Math.max(prevDec.length, currDec.length);
  const prevDecPadded = prevDec.padEnd(maxDecLen, " ");
  const currDecPadded = currDec.padEnd(maxDecLen, " ");

  // Reconstruct with formatting characters from current value
  const currChars = curr.split("");
  const prevAligned: string[] = [];

  let intIdx = 0;
  let decIdx = 0;
  let inDecimal = false;

  for (const char of currChars) {
    if (char === ".") {
      inDecimal = true;
      prevAligned.push(".");
    } else if (/\d/.test(char)) {
      if (inDecimal) {
        prevAligned.push(prevDecPadded[decIdx] || " ");
        decIdx++;
      } else {
        prevAligned.push(prevIntPadded[intIdx] || " ");
        intIdx++;
      }
    } else {
      // Non-digit, non-decimal (like $ or ,)
      prevAligned.push(char);
    }
  }

  return { prevAligned, currAligned: currChars };
}

// Animated amount display
interface AnimatedAmountProps {
  value: string;
  previousValue: string;
  className?: string;
}

function AnimatedAmount({
  value,
  previousValue,
  className,
}: AnimatedAmountProps) {
  const { prevAligned, currAligned } = alignStringsForComparison(
    previousValue,
    value
  );

  let animatingIndex = 0;

  return (
    <span className={className}>
      {currAligned.map((char, index) => {
        const prevChar = prevAligned[index];
        const direction = getCharDirection(prevChar, char);
        const delay = direction !== "none" ? animatingIndex * 40 : 0;
        if (direction !== "none") animatingIndex++;

        return (
          <AnimatedDigit
            key={`${index}-${char}-${value}`}
            char={char}
            direction={direction}
            delay={delay}
          />
        );
      })}
    </span>
  );
}

interface PercentageButtonProps {
  label: string;
  onClick: () => void;
  isLast?: boolean;
}

function PercentageButton({ label, onClick, isLast }: PercentageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 flex items-center justify-center w-full px-4 font-sans text-sm leading-4.5 hover:bg-muted transition-colors cursor-pointer ${
        !isLast ? "border-r border-border" : ""
      }`}
    >
      {label}
    </button>
  );
}

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
        className="absolute invisible whitespace-pre font-display text-[36px] font-medium tracking-[0.8px]"
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
                className={`font-display text-[36px] font-medium tracking-[0.8px] whitespace-nowrap ${
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
            className={`font-display text-[36px] font-medium tracking-[0.8px] bg-transparent border-none outline-none min-w-[40px] ${
              isAnimating && !userInteracted ? "opacity-0" : ""
            } ${
              amount ? "text-card-foreground" : "text-muted-foreground"
            } placeholder:text-muted-foreground`}
          />
        </div>
      </div>

      {/* Percentage Selector */}
      <div className="relative">
        <div className="mt-[35px] h-px w-full bg-border" />
        <div className="absolute flex top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-base h-9 w-[256px] border">
          {PERCENTAGE_OPTIONS.map((option, index) => (
            <PercentageButton
              key={option.label}
              label={option.label}
              onClick={() => handlePercentageClick(option.value)}
              isLast={index === PERCENTAGE_OPTIONS.length - 1}
            />
          ))}
        </div>
      </div>

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
