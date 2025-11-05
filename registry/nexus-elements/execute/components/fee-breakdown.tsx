import React, { useCallback } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import {
  TOKEN_METADATA,
  type SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import { Skeleton } from "../../ui/skeleton";

interface DepositFeeBreakdownProps {
  total: string;
  execute: string;
  tokenSymbol: SUPPORTED_TOKENS;
  isLoading?: boolean;
}

const DepositFeeBreakdown = ({
  total,
  execute,
  tokenSymbol,
  isLoading = false,
}: DepositFeeBreakdownProps) => {
  const formatBalance = useCallback((balance: string, decimals: number) => {
    const num = Number.parseFloat(balance);
    return num.toFixed(Math.min(6, decimals));
  }, []);
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="deposit-fee-breakdown">
        <div className="w-full flex items-start justify-between">
          <p className="font-semibold text-base">Total Fees</p>

          <div className="flex flex-col items-end justify-end-safe gap-y-1">
            {isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <p className="font-semibold text-base min-w-max">
                {formatBalance(total, TOKEN_METADATA[tokenSymbol]?.decimals)}{" "}
                {tokenSymbol}
              </p>
            )}
            <AccordionTrigger
              containerClassName="w-fit"
              className="p-0 items-center gap-x-1"
              hideChevron={false}
            >
              <p className="text-sm font-medium">View Breakdown</p>
            </AccordionTrigger>
          </div>
        </div>
        <AccordionContent>
          <div className="w-full flex flex-col items-center justify-between gap-y-3 bg-muted px-4 py-2 rounded-lg mt-2">
            {/* <div className="flex items-center w-full justify-between">
              <p className="text-sm font-semibold">Transaction Fee</p>
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <p className="text-sm font-semibold">
                  {formatBalance(bridge, TOKEN_METADATA[tokenSymbol]?.decimals)}{" "}
                  {tokenSymbol}
                </p>
              )}
            </div> */}
            <div className="flex items-center w-full justify-between">
              <p className="text-sm font-semibold">Deposit Fee</p>
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <p className="text-sm font-semibold">
                  {formatBalance(
                    execute,
                    TOKEN_METADATA[tokenSymbol]?.decimals
                  )}{" "}
                  {tokenSymbol}
                </p>
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default DepositFeeBreakdown;
