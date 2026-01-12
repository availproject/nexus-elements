"use client";

import { useCallback, useMemo, useState } from "react";
import WidgetHeader from "./widget-header";
import type { DepositWidgetContextValue } from "../types";
import AmountCard from "./amount-card";
import PayUsing from "./pay-using";
import { ErrorBanner } from "./error-banner";
import { Button } from "../../ui/button";
import { CardContent } from "../../ui/card";

interface AmountContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

const AmountContainer = ({ widget, onClose }: AmountContainerProps) => {
  const [hasAmountError, setHasAmountError] = useState(false);

  const selectedTokenAmount = useMemo(
    () => widget.totalSelectedBalance,
    [widget.totalSelectedBalance],
  );

  const selectedChainIds = useMemo(() => {
    const ids = new Set<string>();
    if (widget.swapBalance) {
      widget.swapBalance.forEach((asset) => {
        if (asset.breakdown) {
          asset.breakdown.forEach((b) => {
            if (b.chain && b.balance) {
              ids.add(`${asset.symbol}-${b.chain.id}`);
            }
          });
        }
      });
    }
    return ids;
  }, [widget.swapBalance]);

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
            totalSelectedBalance={widget.totalSelectedBalance}
          />
          {widget.txError && widget.status === "error" && (
            <ErrorBanner message={widget.txError} />
          )}
          <div className="flex flex-col">
            <PayUsing
              onClick={() => widget.goToStep("asset-selection")}
              selectedChainIds={selectedChainIds}
              amount={widget.inputs.amount}
              swapBalance={widget.swapBalance}
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
