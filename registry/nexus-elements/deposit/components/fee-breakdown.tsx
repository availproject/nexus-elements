import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { Skeleton } from "../../ui/skeleton";

interface DepositFeeBreakdownProps {
  total: string;
  bridge: string;
  execute: string;
  isLoading?: boolean;
}

const DepositFeeBreakdown = ({
  total,
  bridge,
  execute,
  isLoading = false,
}: DepositFeeBreakdownProps) => {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="deposit-fee-breakdown">
        <div className="w-full flex items-start justify-between">
          <p className="font-semibold text-base">Total Fees</p>

          <div className="flex flex-col items-end justify-end-safe gap-y-1">
            {isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <p className="font-semibold text-xs min-w-max">{total}</p>
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
            <div className="flex items-center w-full justify-between">
              <p className="text-sm font-semibold">Transaction Fee</p>
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <p className="text-sm font-semibold">{bridge}</p>
              )}
            </div>
            <div className="flex items-center w-full justify-between">
              <p className="text-sm font-semibold">Deposit Fee</p>
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <p className="text-sm font-semibold">{execute}</p>
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default DepositFeeBreakdown;
