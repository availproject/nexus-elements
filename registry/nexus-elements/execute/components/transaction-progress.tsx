import { Check, LoaderPinwheel, Circle, Link as LinkIcon } from "lucide-react";
import React, { type FC, memo, useMemo } from "react";

interface SwapExecuteProgressProps {
  timer: number;
  swapSteps: Array<{
    id: number;
    completed: boolean;
    step: { type?: string; typeID?: string };
  }>;
  swapUrl?: string;
  executeUrl?: string;
  executeCompleted?: boolean;
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

// Custom milestones for the combined Swap + Execute flow

const SwapExecuteProgress: FC<SwapExecuteProgressProps> = ({
  timer,
  swapSteps,
  swapUrl,
  executeUrl,
  executeCompleted = false,
}) => {
  const displaySteps: DisplayStep[] = useMemo(() => {
    const completedByType = new Map<string, boolean>();
    for (const st of swapSteps ?? []) {
      const t = st?.step?.type;
      if (t) completedByType.set(t, Boolean(st.completed));
    }

    const intentCreated = completedByType.get("SWAP_START") ?? false;
    const filledSource = completedByType.get("SOURCE_SWAP_HASH") ?? false;
    const filledDestination =
      completedByType.get("DESTINATION_SWAP_HASH") ?? false;
    const depositing = Boolean(executeCompleted);

    return [
      { id: "M0", label: "Intent created", completed: intentCreated },
      { id: "M1", label: "Filled on source", completed: filledSource },
      {
        id: "M2",
        label: "Filled on destination",
        completed: filledDestination,
      },
      { id: "M3", label: "Depositing to AAVE", completed: depositing },
    ];
  }, [swapSteps, executeCompleted]);

  const { allCompleted, currentIndex } = useMemo(() => {
    const totalSteps = displaySteps.length;
    const completedSteps = displaySteps.reduce(
      (acc, s) => acc + (s.completed ? 1 : 0),
      0
    );
    const percent = totalSteps > 0 ? completedSteps / totalSteps : 0;
    return {
      allCompleted: percent >= 1,
      currentIndex: displaySteps.findIndex((st) => !st.completed),
    };
  }, [displaySteps]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col items-center gap-y-3">
        {allCompleted ? (
          <Check className="size-6 text-green-600" />
        ) : (
          <LoaderPinwheel className="size-6 animate-spin" />
        )}
        <p>
          {allCompleted
            ? "Transaction Completed"
            : "Processing your transaction"}
        </p>
        <div className="flex items-center justify-center w-full">
          <span className="text-2xl font-semibold">{Math.floor(timer)}</span>
          <span className="text-base font-semibold">.</span>
          <span className="text-base font-semibold">
            {String(Math.floor((timer % 1) * 1000)).padStart(3, "0")}s
          </span>
        </div>
      </div>

      <StepList steps={displaySteps} currentIndex={currentIndex} />

      <div className="mt-6 w-full flex items-center justify-center gap-x-4">
        {swapUrl && (
          <a
            href={swapUrl}
            target="_blank"
            rel="noreferrer"
            className="underline text-sm inline-flex items-center gap-x-1"
          >
            <LinkIcon className="size-3" /> View Source Tx
          </a>
        )}
        {executeUrl && (
          <a
            href={executeUrl}
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

export default SwapExecuteProgress;
