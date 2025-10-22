import { Check, LoaderPinwheel, Circle, Link as LinkIcon } from "lucide-react";
import React from "react";
import { type ProgressStep } from "@avail-project/nexus-core";

interface BridgeExecuteProgressProps {
  timer: number;
  steps: Array<{ id: number; completed: boolean; step: ProgressStep }>;
  intentUrl?: string;
  executeUrl?: string;
}

const getOperationText = (type: string) => {
  switch (type) {
    case "bridge":
      return "Transaction";
    case "transfer":
      return "Transferring";
    case "bridgeAndExecute":
      return "Deposit";
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

const StepList: React.FC<{ steps: DisplayStep[]; currentIndex: number }> = ({
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

const BridgeExecuteProgress: React.FC<BridgeExecuteProgressProps> = ({
  timer,
  steps,
  intentUrl,
  executeUrl,
}) => {
  const allCompleted = steps?.length > 0 && steps.every((s) => s.completed);

  const operationType = "bridgeAndExecute";

  const { effectiveSteps, currentIndex } = React.useMemo(() => {
    const isCompleted = (type: string) =>
      Array.isArray(steps) &&
      steps.some((s) => s?.step?.type === type && s.completed);

    const displaySteps: DisplayStep[] = [];
    const seen = new Set<string>();

    // Aggregate allowance progress across multiple chains
    const allowanceRequiredChains = new Set<number | string>();
    const allowanceMinedChains = new Set<number | string>();
    let allowanceAllDoneCompleted = false;

    const getChainIdFromStep = (st: any): number | string | undefined => {
      const direct = st?.data?.chainID ?? st?.chainID;
      if (direct !== undefined && direct !== null) return direct;
      const typeID: string | undefined = st?.typeID;
      if (typeof typeID === "string") {
        const parts = typeID.split("_");
        const last = parts[parts.length - 1];
        if (last) {
          const num = Number(last);
          return Number.isNaN(num) ? last : num;
        }
      }
      return undefined;
    };

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

      // Collect ALLOWANCE_* steps into a single aggregated step later
      if (type.startsWith("ALLOWANCE_")) {
        const chainId = getChainIdFromStep(s?.step as any);
        if (type === "ALLOWANCE_USER_APPROVAL") {
          if (chainId !== undefined) allowanceRequiredChains.add(chainId);
          return;
        }
        if (type === "ALLOWANCE_APPROVAL_MINED") {
          if (chainId !== undefined) {
            allowanceRequiredChains.add(chainId);
            if (s.completed) allowanceMinedChains.add(chainId);
          }
          return;
        }
        if (type === "ALLOWANCE_ALL_DONE") {
          if (s.completed) allowanceAllDoneCompleted = true;
          return;
        }
      }

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

    // Insert aggregated Allowances step before signing, or after intent accepted
    const totalAllowances = new Set([
      ...Array.from(allowanceRequiredChains.values()),
      ...Array.from(allowanceMinedChains.values()),
    ]).size;
    if (totalAllowances > 0 || allowanceAllDoneCompleted) {
      const allowancesCompleted = allowanceMinedChains.size;
      const completed =
        allowanceAllDoneCompleted ||
        (totalAllowances > 0 && allowancesCompleted >= totalAllowances);
      const label = completed
        ? "Allowances Complete"
        : `Setting allowances ${allowancesCompleted}/${totalAllowances}`;

      let insertIdx = displaySteps.findIndex((st) => st.id === "SIGN_SUBMIT");
      if (insertIdx === -1) {
        const idxAccepted = displaySteps.findIndex(
          (st) => st.id === "INTENT_ACCEPTED"
        );
        insertIdx = idxAccepted === -1 ? 0 : idxAccepted + 1;
      }
      displaySteps.splice(insertIdx, 0, {
        id: "ALLOWANCES",
        label,
        completed,
      });
    }

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
