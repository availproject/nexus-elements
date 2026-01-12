"use client";

import { cn } from "./utils";
import { useDepositWidget } from "./hooks/use-deposit-widget";
import {
  AmountContainer,
  ConfirmationContainer,
  ConfirmationLoading,
  TransactionStatusContainer,
  TransactionCompleteContainer,
  AssetSelectionContainer,
} from "./components";
import type {
  WidgetStep,
  DepositWidgetProps,
  NavigationDirection,
} from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const ANIMATION_CLASSES: Record<NonNullable<NavigationDirection>, string> = {
  forward: "animate-slide-in-from-right",
  backward: "animate-slide-in-from-left",
};

const getAnimationClass = (direction: NavigationDirection): string =>
  direction ? ANIMATION_CLASSES[direction] : "";

type ScreenRenderer = (
  widget: ReturnType<typeof useDepositWidget>,
  onClose?: () => void,
) => React.ReactNode;

const SCREENS: Record<WidgetStep, ScreenRenderer> = {
  amount: (widget, onClose) => (
    <AmountContainer widget={widget} onClose={onClose} />
  ),
  confirmation: (widget, onClose) => (
    widget.simulationLoading ? (
      <ConfirmationLoading onClose={onClose} />
    ) : (
      <ConfirmationContainer widget={widget} onClose={onClose} />
    )
  ),
  "transaction-status": (widget, onClose) => (
    <TransactionStatusContainer widget={widget} onClose={onClose} />
  ),
  "transaction-complete": (widget, onClose) => (
    <TransactionCompleteContainer widget={widget} onClose={onClose} />
  ),
  "asset-selection": (widget, onClose) => (
    <AssetSelectionContainer widget={widget} onClose={onClose} />
  ),
};

const NexusDeposit = ({
  heading = "Deposit USDC",
  embed = false,
  className,
  onClose,
  onSuccess,
  onError,
  executeDeposit,
  destination,
}: DepositWidgetProps) => {
  const widget = useDepositWidget({ executeDeposit, destination, onSuccess, onError });
  const animationClass = getAnimationClass(widget.navigationDirection);

  if (embed) {
    return (
      <Card
        className={cn(
          "relative w-full max-w-md overflow-hidden transition-[height] duration-200 ease-out",
          className,
        )}
      >
        <CardHeader className="px-3">
          <CardTitle>{heading}</CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          <div key={widget.step} className={animationClass}>
            {SCREENS[widget.step](widget)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "relative w-full max-w-[400px] overflow-hidden gap-0 transition-[height] duration-200 ease-out",
        className,
      )}
    >
      <div
        key={widget.step}
        className={cn("flex flex-col gap-4", animationClass)}
      >
        {SCREENS[widget.step](widget, onClose)}
      </div>
    </Card>
  );
};

export default NexusDeposit;

// Re-export types and hooks for consumers
export type {
  WidgetStep,
  DepositWidgetContextValue,
  DepositWidgetProps,
  BaseDepositWidgetProps,
  DestinationConfig,
  ExecuteDepositParams,
  ExecuteDepositResult,
  UseDepositWidgetProps,
  TransactionStatus,
  AssetFilterType,
  DepositInputs,
  AssetSelectionState,
} from "./types";
export { useDepositWidget } from "./hooks/use-deposit-widget";
