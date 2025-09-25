import * as React from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { AmountInputProps } from "../types";

const AmountInput: React.FC<AmountInputProps> = ({
  amount,
  onChange,
  sources,
  unifiedBalance,
}) => {
  const onMaxClick = () => {
    if (!unifiedBalance) return;
    const maxBalAvailable = unifiedBalance?.balance;
    onChange(maxBalAvailable);
  };
  return (
    <div className="w-full flex flex-col gap-y-2">
      <Input
        value={amount}
        placeholder="Enter Amount"
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      />

      <Accordion type="single" collapsible>
        <AccordionItem value="sources">
          <div className="flex items-center justify-end-safe gap-x-4 xw-full">
            {sources && (
              <AccordionTrigger className="w-full">
                <div className="w-full">
                  <p className="text-base font-semibold">
                    ({sources?.length}) View Sources
                  </p>
                </div>
              </AccordionTrigger>
            )}

            <div className="flex items-center gap-x-3 min-w-max">
              {unifiedBalance && (
                <p className="text-base font-semibold">
                  {unifiedBalance?.balance} {unifiedBalance?.symbol}
                </p>
              )}
              <Button
                size={"sm"}
                variant={"ghost"}
                onClick={onMaxClick}
                className="px-0"
              >
                Max
              </Button>
            </div>
          </div>
          <AccordionContent>
            {sources && (
              <div className="w-full bg-muted rounded-lg px-4 py-2 flex flex-col items-center gap-y-3">
                {sources?.map((source) => (
                  <div
                    key={source.chainID}
                    className="flex items-center justify-between w-full gap-x-2"
                  >
                    <div className="flex items-center gap-x-2">
                      <img
                        src={source?.chainLogo}
                        alt={source?.chainName}
                        width={20}
                        height={20}
                        className="
                        rounded-full"
                      />
                      <p className="text-sm font-semibold">
                        {source.chainName}
                      </p>
                    </div>

                    <p className="text-sm font-semibold">
                      {source.amount} {unifiedBalance?.symbol}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default AmountInput;
