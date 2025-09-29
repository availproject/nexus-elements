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

const UnifiedBalance = () => {
  const { unifiedBalance } = useNexus();

  const formatBalance = (balance: string, decimals: number) => {
    const num = parseFloat(balance);
    return num.toFixed(Math.min(6, decimals));
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 flex flex-col gap-y-2 items-center overflow-y-scroll max-h-[272px] rounded-lg border border-border">
      <div className="flex items-ceter justify-start w-full">
        <Label className="font-semibold text-muted-foreground">
          Total Balance:
        </Label>

        <Label className="text-lg font-bold gap-x-0">
          <DollarSign className="w-4 h-4 font-bold" strokeWidth={3} />
          {unifiedBalance
            ?.reduce((acc, fiat) => acc + fiat.balanceInFiat, 0)
            .toFixed(2)}
        </Label>
      </div>
      <Accordion type="single" collapsible className="w-full space-y-4">
        {unifiedBalance
          ?.filter((token) => parseFloat(token.balance) > 0)
          .map((token) => (
            <AccordionItem
              key={token.symbol}
              value={token.symbol}
              className="px-4 !shadow-[var(--ck-connectbutton-box-shadow)] !rounded-[var(--ck-connectbutton-border-radius)]"
            >
              <AccordionTrigger
                className="hover:no-underline cursor-pointer"
                hideChevron={false}
              >
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8">
                      {token.icon && (
                        <img
                          src={token.icon}
                          alt={token.symbol}
                          className="rounded-full"
                        />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{token.symbol}</h3>
                      <p className="text-sm text-muted-foreground">
                        ${token.balanceInFiat.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-medium">
                    {formatBalance(token.balance, 6)}
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 py-2">
                  {token.breakdown
                    .filter((chain) => parseFloat(chain.balance) > 0)
                    .map((chain, index, filteredChains) => (
                      <React.Fragment key={chain.chain.id}>
                        <div className="flex items-center justify-between px-2 py-1 rounded-md">
                          <div className="flex items-center gap-2">
                            <div className="relative h-6 w-6">
                              <img
                                src={chain?.chain?.logo}
                                alt={chain.chain.name}
                                sizes="100%"
                                className="rounded-full"
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
                        {index < filteredChains.length - 1 && (
                          <Separator className="my-2" />
                        )}
                      </React.Fragment>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    </div>
  );
};

export default UnifiedBalance;
