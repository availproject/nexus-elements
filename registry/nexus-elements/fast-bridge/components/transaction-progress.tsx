import { Check, Circle, LoaderPinwheel, SquareArrowOutUpRight } from "lucide-react";
import { type FC, memo, useMemo } from "react";
import { Button } from "../../ui/button";

type ProgressStep = { type?: string; typeID?: string; [key: string]: unknown };

interface TransactionProgressProps {
  timer: number;
  steps: Array<{ id: number; completed: boolean; step: ProgressStep }>;
  viewIntentUrl?: string;
  operationType?: string;
  completed?: boolean;
}

export const getOperationText = (type: string) => {
  switch (type) {
    case "bridge":
      return "Transaction";
    case "transfer":
      return "Transferring";
    case "bridgeAndExecute":
      return "Bridge & Execute";
    case "swap":
      return "Swapping";
    default:
      return "Processing";
  }
};

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
  viewIntentUrl,
  operationType = "bridge",
  completed = false,
}) => {
  // Map step types to their completion status for explicit milestone detection
  const stepMap = useMemo(() => {
    const m = new Map<string, boolean>();
    if (Array.isArray(steps)) {
      for (const s of steps) {
        const type = s?.step?.type;
        if (type) m.set(type, !!s.completed);
      }
    }
    return m;
  }, [steps]);

  // Milestone logic — uses VALUE check (get() === true), NOT key presence (has())
  // plan_preview seeds all step types with completed=false, so has() would fire immediately.

  // Intent verified = signing has started or intent submitted
  const intentVerified =
    completed ||
    stepMap.get("request_signing") === true ||
    stepMap.get("request_submission") === true ||
    stepMap.get("allowance_approval") === true;

  // Collected on sources = relayer picked up the intent (bridge_fill seen in any state)
  // bridge_fill gets marked completed=true when EITHER bridge_fill:waiting OR bridge_fill:completed fires
  const collectedOnSources =
    completed ||
    stepMap.get("vault_deposit") === true ||
    stepMap.get("bridge_fill") === true;

  // Filled on destination = ONLY when SDK status is "success"
  // (fires from bridge_fill:completed terminal event → onSuccess → status="success")
  const filledOnDestination = completed;

  // Overall done: ONLY from the completed prop (event-driven), never from step percent
  const allCompleted = completed;

  const opText = getOperationText(operationType);
  const headerText = allCompleted
    ? `${opText} Completed`
    : `${opText} In Progress...`;
  const ctaText = allCompleted ? `View Explorer` : "View Intent";

  const { effectiveSteps, currentIndex } = useMemo(() => {
    const displaySteps: DisplayStep[] = [
      { id: "M0", label: "Intent verified",      completed: intentVerified },
      { id: "M1", label: "Collected on sources", completed: collectedOnSources },
      { id: "M2", label: "Filled on destination", completed: filledOnDestination },
    ];
    const current = allCompleted ? -1 : displaySteps.findIndex((st) => !st.completed);
    return { effectiveSteps: displaySteps, currentIndex: current };
  }, [intentVerified, collectedOnSources, filledOnDestination, allCompleted]);


  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col items-center gap-y-3">
        {allCompleted ? (
          <Check className="size-6 text-green-600" />
        ) : (
          <LoaderPinwheel className="size-6 animate-spin" />
        )}
        <p>{headerText}</p>
        <div className="flex items-center justify-center w-full">
          <span className="text-2xl font-semibold font-nexus-primary text-nexus-black">
            {Math.floor(timer)}
          </span>
          <span className="text-base font-semibold font-nexus-primary text-nexus-black">
            .
          </span>
          <span className="text-base font-semibold font-nexus-primary text-nexus-muted-secondary">
            {String(Math.floor((timer % 1) * 1000)).padStart(3, "0")}s
          </span>
        </div>
      </div>

      <StepList steps={effectiveSteps} currentIndex={currentIndex} />

      {viewIntentUrl && (
        <Button asChild variant="outline" className="mt-8">
          <a href={viewIntentUrl} target="_blank" rel="noreferrer">
            {ctaText}
            <SquareArrowOutUpRight className="size-4" />
          </a>
        </Button>
      )}
    </div>
  );
};

export default TransactionProgress;
