import React, { type FC } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { type ReadableIntent } from "@avail-project/nexus-core";
import { Skeleton } from "../../ui/skeleton";
import { useNexus } from "../../nexus/NexusProvider";

interface FeeBreakdownProps {
  intent: ReadableIntent;
  isLoading?: boolean;
}

const FeeBreakdown: FC<FeeBreakdownProps> = ({ intent, isLoading = false }) => {
  const { nexusSDK } = useNexus();
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="breakdown">
        <div className="w-full flex items-start justify-between">
          <p className="font-semibold text-base">Total fees</p>

          <div className="flex flex-col items-end justify-end-safe gap-y-1">
            {isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <p className="font-semibold text-base min-w-max">
                {nexusSDK?.utils?.formatTokenBalance(intent.fees?.total, {
                  symbol: intent.token?.symbol,
                  decimals: intent?.token?.decimals,
                })}
              </p>
            )}
            <AccordionTrigger
              containerClassName="w-fit"
              className="p-0 items-center gap-x-1"
              hideChevron={false}
            >
              <p className="text-sm font-medium">View Breakup</p>
            </AccordionTrigger>
          </div>
        </div>
        <AccordionContent>
          <div className="w-full flex flex-col items-center justify-between gap-y-3 bg-muted px-4 py-2 rounded-lg mt-2">
            {Number.parseFloat(intent?.fees?.caGas) > 0 && (
              <div className="flex items-center w-full justify-between">
                <p className="text-sm font-semibold">Fast Bridge Gas Fees</p>
                {isLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <p className="text-sm font-semibold">
                    {nexusSDK?.utils?.formatTokenBalance(intent?.fees?.caGas, {
                      symbol: intent.token?.symbol,
                      decimals: intent?.token?.decimals,
                    })}
                  </p>
                )}
              </div>
            )}
            {Number.parseFloat(intent?.fees?.gasSupplied) > 0 && (
              <div className="flex items-center w-full justify-between">
                <p className="text-sm font-semibold">Gas Supplied</p>
                {isLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <p className="text-sm font-semibold">
                    {nexusSDK?.utils?.formatTokenBalance(
                      intent?.fees?.gasSupplied,
                      {
                        symbol: intent.token?.symbol,
                        decimals: intent?.token?.decimals,
                      }
                    )}
                  </p>
                )}
              </div>
            )}
            {Number.parseFloat(intent?.fees?.solver) > 0 && (
              <div className="flex items-center w-full justify-between">
                <p className="text-sm font-semibold">Solver Fees</p>
                {isLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <p className="text-sm font-semibold">
                    {nexusSDK?.utils?.formatTokenBalance(intent?.fees?.solver, {
                      symbol: intent.token?.symbol,
                      decimals: intent?.token?.decimals,
                    })}
                  </p>
                )}
              </div>
            )}
            {Number.parseFloat(intent?.fees?.protocol) > 0 && (
              <div className="flex items-center w-full justify-between">
                <p className="text-sm font-semibold">Protocol Fees</p>
                {isLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <p className="text-sm font-semibold">
                    {nexusSDK?.utils?.formatTokenBalance(
                      intent?.fees?.protocol,
                      {
                        symbol: intent.token?.symbol,
                        decimals: intent?.token?.decimals,
                      }
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default FeeBreakdown;
