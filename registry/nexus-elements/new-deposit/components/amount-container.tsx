"use client";

import { useCallback, useMemo, useState } from "react";
import { CardContent } from "./ui/card";
import WidgetHeader from "./widget-header";
import type { DepositWidgetContextValue } from "../types";
import AmountCard from "./amount-card";
import PayUsing from "./pay-using";
import { Button } from "./ui/button";
import { calculateSelectedAmount } from "../utils/asset-helpers";

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
    [selectedChainIds]
  );

  const handleAmountChange = useCallback(
    (amount: string) => {
      widget.setInputs({ amount });
    },
    [widget.setInputs]
  );

  const handleErrorStateChange = useCallback(
    (hasError: boolean) => {
      setHasAmountError(hasError);
    },
    []
  );

  return (
    <>
      <WidgetHeader title="Deposit USDC" onBack={widget.goBack} onClose={onClose} />
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
            />
            <Button
              className="rounded-t-none"
              onClick={() => widget.goToStep("confirmation")}
              disabled={widget.isProcessing || hasAmountError || !widget.inputs.amount}
            >
              Deposit to Aave
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
};

export default AmountContainer;
