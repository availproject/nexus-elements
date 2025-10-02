"use client";
import * as React from "react";
import { useNexus } from "../nexus/NexusProvider";
import { Label } from "../ui/label";
import { DollarSign } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Separator } from "../ui/separator";

const UnifiedBalance: React.FC = () => {
  const { unifiedBalance } = useNexus();

  const formatBalance = React.useCallback(
    (balance: string, decimals: number) => {
      const num = parseFloat(balance);
      return num.toFixed(Math.min(6, decimals));
    },
    []
  );

  const totalFiat = React.useMemo(() => {
    if (!unifiedBalance) return "0.00";
    const total = unifiedBalance.reduce(
      (acc, fiat) => acc + fiat.balanceInFiat,
      0
    );
    return total.toFixed(2);
  }, [unifiedBalance]);

  const tokens = React.useMemo(() => {
    return (unifiedBalance ?? []).filter(
      (token) => parseFloat(token.balance) > 0
    );
  }, [unifiedBalance]);

  return (
    <div className="w-full max-w-lg mx-auto p-4 flex flex-col gap-y-2 items-center overflow-y-scroll max-h-[372px] rounded-lg border border-border">
      <div className="flex items-center justify-start w-full">
        <Label className="font-semibold text-muted-foreground">
          Total Balance:
        </Label>

        <Label className="text-lg font-bold gap-x-0">
          <DollarSign className="w-4 h-4 font-bold" strokeWidth={3} />
          {totalFiat}
        </Label>
      </div>
      <Accordion type="single" collapsible className="w-full space-y-4">
        {tokens.map((token) => {
          const positiveBreakdown = token.breakdown.filter(
            (chain) => parseFloat(chain.balance) > 0
          );
          const chainsCount = positiveBreakdown.length;
          const chainsLabel =
            chainsCount > 1 ? `${chainsCount} chains` : `${chainsCount} chain`;
          return (
            <AccordionItem
              key={token.symbol}
              value={token.symbol}
              className="px-4"
            >
              <AccordionTrigger
                className="hover:no-underline cursor-pointer items-center"
                hideChevron={false}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8">
                      {token.icon && (
                        <img
                          src={token.icon}
                          alt={token.symbol}
                          className="rounded-full"
                          loading="lazy"
                          decoding="async"
                          width="32"
                          height="32"
                        />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{token.symbol}</h3>
                      <p className="text-sm text-muted-foreground">
                        {chainsLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <p className="text-base font-medium">
                        {formatBalance(token.balance, 6)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${token.balanceInFiat.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 py-2">
                  {positiveBreakdown.map((chain, index) => (
                    <React.Fragment key={chain.chain.id}>
                      <div className="flex items-center justify-between px-2 py-1 rounded-md">
                        <div className="flex items-center gap-2">
                          <div className="relative h-6 w-6">
                            <img
                              src={chain?.chain?.logo}
                              alt={chain.chain.name}
                              sizes="100%"
                              className="rounded-full"
                              loading="lazy"
                              decoding="async"
                              width="24"
                              height="24"
                            />
                          </div>
                          <span className="text-sm">{chain.chain.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatBalance(chain.balance, chain.decimals)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${chain.balanceInFiat.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {index < positiveBreakdown.length - 1 && (
                        <Separator className="my-2" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default React.memo(UnifiedBalance);
