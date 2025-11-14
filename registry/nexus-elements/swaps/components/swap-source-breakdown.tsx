import React from "react";
import { type OnSwapIntentHook } from "@avail-project/nexus-core";
import { useNexus } from "../../nexus/NexusProvider";

type SwapIntent = Parameters<OnSwapIntentHook>[0]["intent"];

interface SwapSourceBreakdownProps {
  intent: SwapIntent;
  isLoading?: boolean;
}

const SwapSourceBreakdown: React.FC<SwapSourceBreakdownProps> = ({
  intent,
}) => {
  const { nexusSDK } = useNexus();
  if (!intent) return null;
  return (
    <div className="w-full border rounded-md p-3">
      <p className="text-sm font-semibold mb-2">Route</p>
      <div className="flex flex-col gap-y-2">
        <div className="flex items-start justify-between gap-x-4">
          <p className="text-sm font-medium">Destination</p>
          <div className="text-right">
            <p className="text-sm font-semibold">
              {nexusSDK?.utils?.formatTokenBalance(intent.destination.amount, {
                symbol: intent.destination.token.symbol,
                decimals: intent.destination.token.decimals,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              on {intent.destination.chain.name}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-y-1">
          <p className="text-sm font-medium">Sources</p>
          {intent.sources.map((s) => (
            <div key={s.chain.id} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {s.chain.name}
              </span>
              <span className="text-sm font-medium">
                {nexusSDK?.utils?.formatTokenBalance(s.amount, {
                  symbol: s.token.symbol,
                  decimals: s.token.decimals,
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SwapSourceBreakdown;
