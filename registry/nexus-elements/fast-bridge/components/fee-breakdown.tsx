import React, { FC } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { type ReadableIntent } from "@avail-project/nexus-core";

interface FeeBreakdownProps {
  intent: ReadableIntent;
}

const FeeBreakdown: FC<FeeBreakdownProps> = ({ intent }) => {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="breakdown">
        <div className="w-full flex items-start justify-between">
          <p className="font-semibold text-base">Total fees</p>

          <div className="flex flex-col items-end justify-end-safe gap-y-1">
            <p className="font-semibold text-base min-w-max">
              {intent.fees?.total} {intent.token?.symbol}
            </p>
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
            <div className="flex items-center w-full justify-between">
              <p className="text-sm font-semibold">Fast Bridge Gas Fee</p>
              <p className="text-sm font-semibold">
                {intent?.fees?.caGas} {intent?.token?.symbol}
              </p>
            </div>
            <div className="flex items-center w-full justify-between">
              <p className="text-sm font-semibold">Gas Supplied</p>
              <p className="text-sm font-semibold">
                {intent?.fees?.gasSupplied} {intent?.token?.symbol}
              </p>
            </div>
            <div className="flex items-center w-full justify-between">
              <p className="text-sm font-semibold">Solver Fees</p>
              <p className="text-sm font-semibold">
                {intent?.fees?.solver} {intent?.token?.symbol}
              </p>
            </div>
            <div className="flex items-center w-full justify-between">
              <p className="text-sm font-semibold">Protocol Fees</p>
              <p className="text-sm font-semibold">
                {intent?.fees?.protocol} {intent?.token?.symbol}
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default FeeBreakdown;
