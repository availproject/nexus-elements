"use client";

import { useCallback, useMemo, useState } from "react";
import WidgetHeader from "./widget-header";
import type { DepositWidgetContextValue } from "../types";
import AmountCard from "./amount-card";
import PayUsing from "./pay-using";
import { calculateSelectedAmount } from "../utils/asset-helpers";
import { Button } from "../../ui/button";
import { CardContent } from "../../ui/card";

interface AmountContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

const AmountContainer = ({ widget, onClose }: AmountContainerProps) => {
  const { selectedChainIds, filter } = widget.assetSelection;
  const [hasAmountError, setHasAmountError] = useState(false);

  // Calculate total selected token amount
  const selectedTokenAmount = useMemo(
    () => calculateSelectedAmount(selectedChainIds),
    [selectedChainIds],
  );

  const handleAmountChange = useCallback(
    (amount: string) => {
      widget.setInputs({ amount });
    },
    [widget.setInputs],
  );

  const handleErrorStateChange = useCallback((hasError: boolean) => {
    setHasAmountError(hasError);
  }, []);

  return (
    <>
      <WidgetHeader title="Deposit USDC" onClose={onClose} />
      <CardContent>
        <div className="flex flex-col gap-4">
          <AmountCard
            amount={widget.inputs.amount ?? ""}
            onAmountChange={handleAmountChange}
            selectedTokenAmount={selectedTokenAmount}
            onErrorStateChange={handleErrorStateChange}
          />
          <div className="flex flex-col">
            <PayUsing
              onClick={() => widget.goToStep("asset-selection")}
              selectedChainIds={selectedChainIds}
              filter={filter}
              amount={widget.inputs.amount}
            />
            <Button
              className="rounded-t-none"
              onClick={() => widget.goToStep("confirmation")}
              disabled={
                widget.isProcessing || hasAmountError || !widget.inputs.amount
              }
            >
              Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
};

export default AmountContainer;
