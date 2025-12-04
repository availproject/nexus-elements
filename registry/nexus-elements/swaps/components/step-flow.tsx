import { FC, Fragment, memo } from "react";
import { TokenIcon } from "./token-icon";
import { cn } from "@/lib/utils";
import { Atom, CircleCheck, SquareArrowOutUpRight } from "lucide-react";
import { DisplayStep } from "./transaction-progress";

interface StepFlowProps {
  steps: DisplayStep[];
  currentIndex: number;
  totalSteps: number;
  explorerUrls: {
    sourceExplorerUrl: string | null;
    destinationExplorerUrl: string | null;
  };
  sourceSymbol: string;
  destinationSymbol: string;
  sourceLogos: {
    token: string;
    chain: string;
  };
  destinationLogos: {
    token: string;
    chain: string;
  };
  allCompleted: boolean;
}

export const StepFlow: FC<StepFlowProps> = memo(
  ({
    steps,
    currentIndex,
    totalSteps,
    sourceSymbol,
    destinationSymbol,
    sourceLogos,
    destinationLogos,
    explorerUrls,
    allCompleted,
  }) => {
    return (
      <>
        {steps.map((step, index) => {
          const isCompleted = !!step.completed;
          const isCurrent =
            currentIndex === -1 ? false : index === currentIndex;
          const isLast = index === steps.length - 1;
          const url = isLast
            ? explorerUrls.destinationExplorerUrl
            : index === steps.length - 2
              ? explorerUrls.sourceExplorerUrl
              : null;

          return (
            <Fragment key={step.id}>
              <StepItem
                step={step}
                isCompleted={isCompleted}
                isCurrent={isCurrent}
                index={index}
                symbol={isLast ? destinationSymbol : sourceSymbol}
                logos={isLast ? destinationLogos : sourceLogos}
                totalSteps={totalSteps}
                explorerUrl={url}
                allCompleted={allCompleted}
              />

              {!isLast && (
                <div className="flex w-max ml-[11px]">
                  <div
                    className={cn(
                      "w-0.5 h-5 transition-all duration-500 border border-dashed border-border",
                      isCurrent && "border-chart-1",
                    )}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </>
    );
  },
);

StepFlow.displayName = "StepFlow";

interface StepItemProps {
  step: DisplayStep;
  symbol: string;
  logos: {
    token: string;
    chain: string;
  };
  explorerUrl: string | null;
  isCompleted: boolean;
  isCurrent: boolean;
  totalSteps: number;
  index: number;
  allCompleted: boolean;
}

const StepItem: FC<StepItemProps> = memo(
  ({
    step,
    isCompleted,
    isCurrent,
    logos,
    symbol,
    totalSteps,
    index,
    explorerUrl,
    allCompleted,
  }) => {
    const isSecondLast = index === totalSteps - 2;
    return (
      <div
        className={cn(
          "flex gap-x-4 items-center rounded-lg transition-all duration-150 ease-out w-full",
          isCurrent && "opacity-80",
          isCompleted && "bg-transparent opacity-50",
          allCompleted ? "opacity-100" : "opacity-50",
        )}
      >
        {/* Left Token Image */}
        {isCurrent ? (
          <div className=" rounded-full relative">
            <div
              className={cn(
                "rounded-full size-6 flex items-center justify-center transition-all duration-500",
                isCurrent
                  ? "ring-2 ring-ring ring-offset-4 ring-offset-black"
                  : "",
              )}
            >
              {isSecondLast ? (
                <Atom className={cn("size-4  animate-pulse ")} />
              ) : (
                <TokenIcon
                  size="sm"
                  symbol={symbol}
                  chainLogo={logos.chain}
                  tokenLogo={logos.token}
                  className={cn(
                    "w-full h-full object-cover",
                    isCurrent && "animate-pulse",
                  )}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="size-6 flex items-center justify-center rounded-full">
            <span className={cn("size-2 rounded-full bg-ring/80")} />
          </div>
        )}

        {/* Content */}
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col items-start gap-y-1">
            <h3
              className={cn(
                "font-semibold transition-colors duration-500",
                isCompleted || isCurrent
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {step.label}
            </h3>
            {explorerUrl &&
              isCompleted &&
              (isSecondLast || index === totalSteps - 1) && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground inline-flex items-center gap-x-1"
                >
                  <SquareArrowOutUpRight className="size-3" /> View Transaction
                </a>
              )}
          </div>

          {/* Right Actions */}
          {isCurrent && (
            <div className="flex items-center justify-center gap-2">
              <p className="text-xs text-muted-foreground">
                Step {index + 1} of {totalSteps}
              </p>
            </div>
          )}
          {isCompleted && (
            <div className="flex items-center justify-center gap-2">
              <CircleCheck className="size-5 text-chart-1" />
            </div>
          )}
        </div>
      </div>
    );
  },
);

StepItem.displayName = "StepItem";
