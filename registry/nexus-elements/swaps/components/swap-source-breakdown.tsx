import React from "react";
import { type OnSwapIntentHook } from "@avail-project/nexus-core";

type SwapIntent = Parameters<OnSwapIntentHook>[0]["intent"];

interface SwapSourceBreakdownProps {
  intent: SwapIntent;
  isLoading?: boolean;
}

const SwapSourceBreakdown: React.FC<SwapSourceBreakdownProps> = ({
  intent,
  isLoading,
}) => {
  if (!intent) return null;
  return (
    <div className="w-full border rounded-md p-3">
      <p className="text-sm font-semibold mb-2">Route</p>
      <div className="flex flex-col gap-y-2">
        <div className="flex items-start justify-between gap-x-4">
          <p className="text-sm font-medium">Destination</p>
          <div className="text-right">
            <p className="text-sm font-semibold">
              {intent.destination.amount} {intent.destination.token.symbol}
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
                {s.amount} {s.token.symbol}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SwapSourceBreakdown;
