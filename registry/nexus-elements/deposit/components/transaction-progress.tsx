import { Check, LoaderPinwheel, Circle, Link as LinkIcon } from "lucide-react";
import React from "react";
import { type ProgressStep } from "@avail-project/nexus-core";

interface BridgeExecuteProgressProps {
  timer: number;
  steps: Array<{ id: number; completed: boolean; step: ProgressStep }>;
  intentUrl?: string;
  executeUrl?: string;
}

const BridgeExecuteProgress: React.FC<BridgeExecuteProgressProps> = ({
  timer,
  steps,
  intentUrl,
  executeUrl,
}) => {
  const allCompleted = steps?.length > 0 && steps.every((s) => s.completed);

  // BEGIN: StepList + status mapping (aligned with fast-bridge component)
  const getOperationText = (type: string) => {
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

  const getStatusText = (type: string, operationType: string) => {
    const opText = getOperationText(operationType);

    switch (type) {
      case "INTENT_ACCEPTED":
        return "Intent Accepted";
      case "INTENT_HASH_SIGNED":
        return "Signing Transaction";
      case "INTENT_SUBMITTED":
        return "Submitting Transaction";
      case "INTENT_COLLECTION":
        return "Collecting Confirmations";
      case "INTENT_COLLECTION_COMPLETE":
        return "Confirmations Complete";
      case "APPROVAL":
        return "Approving";
      case "TRANSACTION_SENT":
        return "Sending Transaction";
      case "RECEIPT_RECEIVED":
        return "Receipt Received";
      case "TRANSACTION_CONFIRMED":
      case "INTENT_FULFILLED":
        return `${opText} Complete`;
      default:
        return `Processing ${opText}`;
    }
  };

  const KNOWN_TYPES = new Set<string>([
    "INTENT_ACCEPTED",
    "INTENT_HASH_SIGNED",
    "INTENT_SUBMITTED",
    "INTENT_COLLECTION",
    "INTENT_COLLECTION_COMPLETE",
    "APPROVAL",
    "TRANSACTION_SENT",
    "RECEIPT_RECEIVED",
    "TRANSACTION_CONFIRMED",
    "INTENT_FULFILLED",
  ]);

  type DisplayStep = { id: string; label: string; completed: boolean };

  const StepList: React.FC<{ steps: DisplayStep[]; currentIndex: number }> =
    React.memo(({ steps, currentIndex }) => {
      return (
        <div className="w-full mt-6 space-y-6">
          {steps.map((s, idx) => {
            const isCompleted = !!s.completed;
            const isCurrent =
              currentIndex === -1 ? false : idx === currentIndex;

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
    });

  const operationType = "bridgeAndExecute";

  const { effectiveSteps, currentIndex } = React.useMemo(() => {
    const isCompleted = (type: string) =>
      Array.isArray(steps) &&
      steps.some((s) => s?.step?.type === type && s.completed);

    const displaySteps: DisplayStep[] = [];
    const seen = new Set<string>();

    const pushCombinedSignSubmit = () => {
      if (seen.has("SIGN_SUBMIT")) return;
      const label = isCompleted("INTENT_HASH_SIGNED")
        ? "Submitting Transaction"
        : "Signing Transaction";
      const completed = isCompleted("INTENT_SUBMITTED");
      displaySteps.push({ id: "SIGN_SUBMIT", label, completed });
      seen.add("SIGN_SUBMIT");
      seen.add("INTENT_HASH_SIGNED");
      seen.add("INTENT_SUBMITTED");
    };

    const pushCombinedConfirmations = () => {
      if (seen.has("CONFIRMATIONS")) return;
      const label = isCompleted("INTENT_COLLECTION")
        ? "Confirmations Complete"
        : "Collecting Confirmations";
      const completed = isCompleted("INTENT_COLLECTION_COMPLETE");
      displaySteps.push({ id: "CONFIRMATIONS", label, completed });
      seen.add("CONFIRMATIONS");
      seen.add("INTENT_COLLECTION");
      seen.add("INTENT_COLLECTION_COMPLETE");
    };

    const pushTransactionComplete = (type: string) => {
      if (seen.has("TX_COMPLETE")) return;
      const completed =
        isCompleted("TRANSACTION_CONFIRMED") ||
        isCompleted("INTENT_FULFILLED") ||
        isCompleted(type);
      displaySteps.push({
        id: "TX_COMPLETE",
        label: getStatusText("INTENT_FULFILLED", operationType),
        completed,
      });
      seen.add("TX_COMPLETE");
    };

    (steps ?? []).forEach((s) => {
      const type = s?.step?.type as unknown as string;
      if (!type || seen.has(type)) return;

      if (type === "INTENT_HASH_SIGNED" || type === "INTENT_SUBMITTED") {
        pushCombinedSignSubmit();
        return;
      }

      if (
        type === "INTENT_COLLECTION" ||
        type === "INTENT_COLLECTION_COMPLETE"
      ) {
        pushCombinedConfirmations();
        return;
      }

      if (type === "TRANSACTION_CONFIRMED" || type === "INTENT_FULFILLED") {
        pushTransactionComplete(type);
        return;
      }

      if (KNOWN_TYPES.has(type)) {
        displaySteps.push({
          id: type,
          label: getStatusText(type, operationType),
          completed: !!s.completed,
        });
        seen.add(type);
      }
    });

    let effective: DisplayStep[] = displaySteps;
    if (!displaySteps.length) {
      effective = allCompleted
        ? []
        : [
            {
              id: "GENERIC",
              label: `Processing ${getOperationText(operationType)}`,
              completed: false,
            },
          ];
    }
    const current = effective.findIndex((st) => !st.completed);

    return { effectiveSteps: effective, currentIndex: current };
  }, [steps, allCompleted]);
  // END: StepList + status mapping

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
            ? "Bridge & Execute Completed"
            : "Bridge & Execute In Progress..."}
        </p>
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
