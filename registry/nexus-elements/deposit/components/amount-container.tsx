"use client";

import { useCallback, useMemo, useState } from "react";
import WidgetHeader from "./widget-header";
import type { DepositWidgetContextValue } from "../types";
import AmountCard from "./amount-card";
import PayUsing from "./pay-using";
import { ErrorBanner } from "./error-banner";
import { EmptyBalanceState } from "./empty-balance-state";
import { Button } from "../../ui/button";
import { CardContent } from "../../ui/card";
import { Skeleton } from "../../ui/skeleton";
import { MIN_SELECTABLE_SOURCE_BALANCE_USD } from "../constants/widget";
import { parseNonNegativeNumber } from "../utils";

interface AmountContainerProps {
  widget: DepositWidgetContextValue;
  heading?: string;
  onClose?: () => void;
}

const AmountContainer = ({
  widget,
  heading,
  onClose,
}: AmountContainerProps) => {
  const [hasAmountError, setHasAmountError] = useState(false);
  const isSwapBalanceLoaded = widget.swapBalance !== null;
  const hasAnySwapAsset = (widget.swapBalance?.length ?? 0) > 0;
  const hasPositiveSwapBalance = useMemo(
    () =>
      (widget.swapBalance ?? []).some((asset) =>
        (asset.breakdown ?? []).some((chain) => {
          const amount = Number.parseFloat(chain.balance ?? "0");
          return Number.isFinite(amount) && amount > 0;
        }),
      ),
    [widget.swapBalance],
  );
  const shouldShowEmptyState = isSwapBalanceLoaded && !hasPositiveSwapBalance;
  const selectedTokenAmount = useMemo(() => {
    if (!widget.swapBalance) return 0;

    let total = 0;
    const selectedChainIds = widget.assetSelection.selectedChainIds;

    widget.swapBalance.forEach((asset) => {
      asset.breakdown?.forEach((chainBreakdown) => {
        const chainId = chainBreakdown.chain?.id;
        const tokenAddress = chainBreakdown.contractAddress;
        if (!chainId || !tokenAddress) return;

        const sourceId = `${tokenAddress}-${chainId}`;
        const usdValue = parseNonNegativeNumber(chainBreakdown.balanceInFiat);
        if (usdValue < MIN_SELECTABLE_SOURCE_BALANCE_USD) return;

        if (selectedChainIds.has(sourceId)) {
          total += usdValue;
        }
      });
    });

    return total;
  }, [widget.swapBalance, widget.assetSelection]);

  const handleAmountChange = useCallback(
    (amount: string) => {
      widget.setInputs({ amount });
    },
    [widget],
  );

  const handleErrorStateChange = useCallback((hasError: boolean) => {
    setHasAmountError(hasError);
  }, []);

  return (
    <>
      <WidgetHeader
        title={heading ?? ""}
        onClose={onClose}
        depositTargetLogo={widget?.destination?.depositTargetLogo}
      />
      <CardContent>
        <div className="flex flex-col gap-4">
          {!isSwapBalanceLoaded ? (
            <Skeleton className="min-h-[212px]" />
          ) : shouldShowEmptyState ? (
            <EmptyBalanceState
              mode={hasAnySwapAsset ? "zero-balance" : "no-swap-assets"}
              onRefresh={() => {
                void widget.reset();
              }}
            />
          ) : (
            <AmountCard
              totalBalance={widget.totalBalance!}
              amount={widget.inputs.amount ?? ""}
              onAmountChange={handleAmountChange}
              selectedTokenAmount={selectedTokenAmount}
              onErrorStateChange={handleErrorStateChange}
              totalSelectedBalance={selectedTokenAmount}
              destinationConfig={widget.destination}
            />
          )}

          {widget.txError && widget.status === "error" && (
            <ErrorBanner message={widget.txError} />
          )}
          {!shouldShowEmptyState && (
            <div className="flex flex-col">
              <PayUsing
                onClick={() => widget.goToStep("asset-selection")}
                selectedChainIds={widget.assetSelection.selectedChainIds}
                amount={widget.inputs.amount}
                swapBalance={widget.swapBalance}
                destination={widget.destination}
              />
              <Button
                className="rounded-t-none"
                onClick={() => widget.goToStep("confirmation")}
                disabled={
                  widget.isProcessing ||
                  hasAmountError ||
                  !widget.inputs.amount ||
                  widget.inputs.amount === "0"
                }
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </>
  );
};

export default AmountContainer;
