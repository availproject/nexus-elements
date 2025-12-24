import { useMemo, useState, useEffect, useRef } from "react";
import ButtonCard from "./button-card";
import { RightChevronIcon, CoinIcon } from "./icons";
import type { AssetFilterType } from "../types";
import { TOKENS } from "../data/tokens";
import { parseUsdValue } from "../utils/asset-helpers";
import { Skeleton } from "../../ui/skeleton";

interface PayUsingProps {
  onClick?: () => void;
  selectedChainIds: Set<string>;
  filter: AssetFilterType;
  amount?: string;
}

function PayUsing({
  onClick,
  selectedChainIds,
  filter,
  amount,
}: PayUsingProps) {
  const [isLoading, setIsLoading] = useState(false);
  const previousAmountRef = useRef<string | undefined>(undefined);
  const hasAmount = Boolean(amount && amount.trim() !== "");

  // Trigger loading state when amount changes from empty to non-empty
  useEffect(() => {
    const hadAmount = Boolean(
      previousAmountRef.current && previousAmountRef.current.trim() !== ""
    );

    if (hasAmount && !hadAmount) {
      // Amount just became non-empty, show loading
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 600);
      return () => clearTimeout(timer);
    }

    previousAmountRef.current = amount;
  }, [amount, hasAmount]);

  // Calculate selection summary
  const { subtitle, selectedCount, totalUsdValue } = useMemo(() => {
    // Count selected tokens per symbol
    const tokenCounts: Record<string, number> = {};
    let total = 0;

    TOKENS.forEach((token) => {
      const selectedChains = token.chains.filter((c) =>
        selectedChainIds.has(c.id)
      );
      if (selectedChains.length > 0) {
        tokenCounts[token.symbol] = selectedChains.length;
        selectedChains.forEach((c) => {
          total += parseUsdValue(c.usdValue);
        });
      }
    });

    const symbols = Object.keys(tokenCounts);
    const count = Object.values(tokenCounts).reduce((a, b) => a + b, 0);

    // Generate subtitle - show token symbols like "USDC, ETH + 2 more"
    let text: string;
    if (count === 0) {
      text = "No tokens selected";
    } else if (symbols.length <= 2) {
      text = symbols.join(", ");
    } else {
      text = `${symbols.slice(0, 2).join(", ")} +${symbols.length - 2} more`;
    }

    return {
      subtitle: text,
      selectedCount: count,
      totalUsdValue: total,
    };
  }, [selectedChainIds, filter]);

  // Render subtitle based on state
  const renderSubtitle = () => {
    if (!hasAmount) {
      return (
        <span className="text-[13px] leading-4.5 text-muted-foreground font-sans">
          Auto-selected based on amount
        </span>
      );
    }

    if (isLoading) {
      return <Skeleton className="h-4 w-32 bg-muted" />;
    }

    return (
      <span className="text-[13px] leading-4.5 text-muted-foreground font-sans">
        {subtitle}
      </span>
    );
  };

  // Only show edit button and chevron when amount is entered and not loading
  const showEditControls = hasAmount && !isLoading;

  return (
    <ButtonCard
      title="Pay Using"
      subtitle={renderSubtitle()}
      icon={<CoinIcon className="w-6 h-6 text-muted-foreground" />}
      rightIcon={
        showEditControls ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm leading-4.5 transition-colors duration-200 group-hover/button-card:text-card-foreground">
              Edit
            </span>
            <RightChevronIcon
              size={20}
              className="text-muted-foreground transition-colors duration-200 group-hover/button-card:text-card-foreground"
            />
          </div>
        ) : undefined
      }
      onClick={showEditControls ? onClick : undefined}
      disabled={!showEditControls}
      roundedBottom={false}
    />
  );
}

export default PayUsing;
