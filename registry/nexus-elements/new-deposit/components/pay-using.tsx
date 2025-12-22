import { useMemo } from "react";
import ButtonCard from "./button-card";
import { RightChevronIcon, CoinIcon } from "./icons";
import type { AssetFilterType } from "../types";
import { TOKENS } from "../data/tokens";
import { parseUsdValue } from "../utils/asset-helpers";

interface PayUsingProps {
  onClick?: () => void;
  selectedChainIds: Set<string>;
  filter: AssetFilterType;
}

function PayUsing({ onClick, selectedChainIds, filter }: PayUsingProps) {
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

    // Generate subtitle based on filter
    let text: string;
    if (count === 0) {
      text = "No tokens selected";
    } else if (filter === "all") {
      text = `${count} assets (Use any)`;
    } else if (filter === "stablecoins") {
      text = `${count} stablecoins`;
    } else if (filter === "native") {
      text = `${count} native tokens`;
    } else {
      // Custom - list selected token symbols
      if (symbols.length <= 2) {
        text = symbols.join(", ");
      } else {
        text = `${symbols.slice(0, 2).join(", ")} +${symbols.length - 2} more`;
      }
    }

    return {
      subtitle: text,
      selectedCount: count,
      totalUsdValue: total,
    };
  }, [selectedChainIds, filter]);

  return (
    <ButtonCard
      title="Pay Using"
      subtitle={subtitle}
      icon={<CoinIcon className="w-6 h-6 text-muted-foreground" />}
      rightIcon={
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm leading-4.5 transition-colors duration-200 group-hover/button-card:text-card-foreground">
            Edit
          </span>
          <RightChevronIcon className="text-muted-foreground transition-colors duration-200 group-hover/button-card:text-card-foreground" />
        </div>
      }
      onClick={onClick}
      roundedBottom={false}
    />
  );
}

export default PayUsing;
