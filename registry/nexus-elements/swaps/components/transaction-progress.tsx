import { Check, Circle, Link as LinkIcon, LoaderPinwheel } from "lucide-react";
import React, { type FC, memo, useMemo } from "react";
import {
  type BridgeStepType,
  type SwapStepType,
} from "@avail-project/nexus-core";

type ProgressStep = BridgeStepType | SwapStepType;

interface TransactionProgressProps {
  timer: number;
  steps: Array<{ id: number; completed: boolean; step: ProgressStep }>;
  sourceExplorerUrl?: string;
  destinationExplorerUrl?: string;
}

type DisplayStep = { id: string; label: string; completed: boolean };

const StepList: FC<{ steps: DisplayStep[]; currentIndex: number }> = memo(
  ({ steps, currentIndex }) => {
    return (
      <div className="w-full mt-6 space-y-6">
        {steps.map((s, idx) => {
          const isCompleted = !!s.completed;
          const isCurrent = currentIndex === -1 ? false : idx === currentIndex;

          let rightIcon = <Circle className="size-5 text-muted-foreground" />;
          if (isCompleted) {
            rightIcon = <Check className="size-5 text-green-600" />;
          } else if (isCurrent) {
            rightIcon = (
              <LoaderPinwheel className="size-5 animate-spin text-muted-foreground" />
            );
          }

          return (
            <div
              key={s.id}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-x-3">
                <span className="text-base font-semibold">{s.label}</span>
              </div>
              {rightIcon}
            </div>
          );
        })}
      </div>
    );
  }
);
StepList.displayName = "StepList";

const TransactionProgress: FC<TransactionProgressProps> = ({
  timer,
  steps,
  sourceExplorerUrl,
  destinationExplorerUrl,
}) => {
  const { effectiveSteps, currentIndex, allCompleted } = useMemo(() => {
    const completedTypes = new Set<string | undefined>(
      steps?.filter((s) => s?.completed).map((s) => s?.step?.type)
    );
    // Consider only steps that were actually emitted by the SDK (ignore pre-seeded placeholders)
    const eventfulTypes = new Set<string | undefined>(
      steps
        ?.filter((s) => {
          const st = s?.step ?? {};
          return (
            "explorerURL" in st || "chain" in st || "completed" in st // present when event args were merged into step
          );
        })
        .map((s) => s?.step?.type)
    );
    const hasAny = (types: string[]) =>
      types.some((t) => completedTypes.has(t));
    const sawAny = (types: string[]) => types.some((t) => eventfulTypes.has(t));

    const intentVerified = hasAny(["DETERMINING_SWAP", "SWAP_START"]);

    // If the flow does not include SOURCE_* steps, consider it implicitly collected
    const sourceStepTypes = [
      "CREATE_PERMIT_EOA_TO_EPHEMERAL",
      "CREATE_PERMIT_FOR_SOURCE_SWAP",
      "SOURCE_SWAP_BATCH_TX",
      "SOURCE_SWAP_HASH",
    ];
    const collectedOnSources =
      (sawAny(sourceStepTypes) &&
        hasAny(["SOURCE_SWAP_HASH", "SOURCE_SWAP_BATCH_TX"])) ||
      (!sawAny(sourceStepTypes) &&
        hasAny([
          "DESTINATION_SWAP_BATCH_TX",
          "DESTINATION_SWAP_HASH",
          "SWAP_COMPLETE",
        ]));

    const filledOnDestination = hasAny([
      "DESTINATION_SWAP_HASH",
      "DESTINATION_SWAP_BATCH_TX",
      "SWAP_COMPLETE",
    ]);

    const displaySteps: DisplayStep[] = [
      { id: "intent", label: "Intent verified", completed: intentVerified },
      {
        id: "collected",
        label: "Collected on sources",
        completed: collectedOnSources,
      },
      {
        id: "filled",
        label: "Filled on destination",
        completed: filledOnDestination,
      },
    ];

    // Mark overall completion ONLY when the SDK reports SWAP_COMPLETE
    const done = hasAny(["SWAP_COMPLETE"]);
    const current = displaySteps.findIndex((st) => !st.completed);
    return {
      effectiveSteps: displaySteps,
      currentIndex: current,
      allCompleted: done,
    };
  }, [steps]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col items-center gap-y-3">
        {allCompleted ? (
          <Check className="size-6 text-green-600" />
        ) : (
          <LoaderPinwheel className="size-6 animate-spin" />
        )}
        <p>{allCompleted ? "Swap Completed" : "Swap In Progress..."}</p>
        <div className="flex items-center justify-center w-full">
          <span className="text-2xl font-semibold">{Math.floor(timer)}</span>
          <span className="text-base font-semibold">.</span>
          <span className="text-base font-semibold">
            {String(Math.floor((timer % 1) * 1000)).padStart(3, "0")}s
          </span>
        </div>
      </div>

      <StepList steps={effectiveSteps} currentIndex={currentIndex} />

      <div className="mt-6 w-full flex items-center justify-center gap-x-4">
        {sourceExplorerUrl && (
          <a
            href={sourceExplorerUrl}
            target="_blank"
            rel="noreferrer"
            className="underline text-sm inline-flex items-center gap-x-1"
          >
            <LinkIcon className="size-3" /> View Source Tx
          </a>
        )}
        {destinationExplorerUrl && (
          <a
            href={destinationExplorerUrl}
            target="_blank"
            rel="noreferrer"
            className="underline text-sm inline-flex items-center gap-x-1"
          >
            <LinkIcon className="size-3" /> View Destination Tx
          </a>
        )}
      </div>
    </div>
  );
};

export default TransactionProgress;
