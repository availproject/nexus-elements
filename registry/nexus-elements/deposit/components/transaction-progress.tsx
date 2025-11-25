import { Check, LoaderPinwheel, Circle, Link as LinkIcon } from "lucide-react";
import { type FC, useMemo } from "react";
import {
  type BridgeStepType,
  type SwapStepType,
} from "@avail-project/nexus-core";

type ProgressStep = BridgeStepType | SwapStepType;

interface BridgeExecuteProgressProps {
  timer: number;
  steps: Array<{ id: number; completed: boolean; step: ProgressStep }>;
  intentUrl?: string;
  executeUrl?: string;
}

type DisplayStep = { id: string; label: string; completed: boolean };

const StepList: FC<{ steps: DisplayStep[]; currentIndex: number }> = ({
  steps,
  currentIndex,
}) => {
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
          <div key={s.id} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-x-3">
              <span className="text-base font-semibold">{s.label}</span>
            </div>
            {rightIcon}
          </div>
        );
      })}
    </div>
  );
};

const BridgeExecuteProgress: FC<BridgeExecuteProgressProps> = ({
  timer,
  steps,
  intentUrl,
  executeUrl,
}) => {
  const totalSteps = Array.isArray(steps) ? steps.length : 0;
  const completedSteps = Array.isArray(steps)
    ? steps.reduce((acc, s) => acc + (s?.completed ? 1 : 0), 0)
    : 0;
  const percent = totalSteps > 0 ? completedSteps / totalSteps : 0;
  const allCompleted = percent >= 1;

  // Custom milestone copy for deposit flow
  const milestones = useMemo(
    () => [
      "Intent verified",
      "Collected on sources",
      "Filled on destination",
      "Depositing",
    ],
    []
  );
  const thresholds = useMemo(
    () => milestones.map((_, idx) => (idx + 1) / milestones.length),
    [milestones]
  );
  const displaySteps: DisplayStep[] = milestones.map((label, idx) => ({
    id: `M${idx}`,
    label,
    completed: percent >= thresholds[idx],
  }));
  const currentIndex = displaySteps.findIndex((st) => !st.completed);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col items-center gap-y-3">
        {allCompleted ? (
          <Check className="size-6 text-green-600" />
        ) : (
          <LoaderPinwheel className="size-6 animate-spin" />
        )}
        <p>{allCompleted ? "Deposit Completed" : "Processing your deposit"}</p>
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
        {intentUrl && (
          <a
            href={intentUrl}
            target="_blank"
            rel="noreferrer"
            className="underline text-sm inline-flex items-center gap-x-1"
          >
            <LinkIcon className="size-3" /> View Intent
          </a>
        )}
        {executeUrl && (
          <a
            href={executeUrl}
            target="_blank"
            rel="noreferrer"
            className="underline text-sm inline-flex items-center gap-x-1"
          >
            <LinkIcon className="size-3" /> View Execute Tx
          </a>
        )}
      </div>
    </div>
  );
};

export default BridgeExecuteProgress;
