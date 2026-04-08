import { type FC, useMemo } from "react";
// v2: BridgeStepType/SwapStepType removed — use generic record step shape
type ProgressStep = { type?: string; typeID?: string; [key: string]: unknown };

import { StepFlow } from "./step-flow";

export type DisplayStep = { id: string; label: string; completed: boolean };

interface TokenSource {
  tokenLogo: string;
  chainLogo: string;
  symbol: string;
}

interface TransactionProgressProps {
  steps: Array<{ id: number; completed: boolean; step: ProgressStep }>;
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
  hasMultipleSources?: boolean;
  sources?: TokenSource[];
}

const STEP_TYPES = {
  // v2 step type strings (snake_case)
  INTENT_VERIFICATION: ["bridge_intent_submission", "request_signing"],
  SOURCE_STEP_TYPES: [
    "eoa_to_ephemeral_transfer",
    "source_swap",
    "bridge_deposit",
    "bridge_intent_submission",
  ],
  SOURCE_TRANSACTION: ["source_swap", "bridge_deposit"],
  DESTINATION_STEP_TYPES: [
    "bridge_fill",
    "destination_swap",
  ],
  TRANSACTION_COMPLETE: ["bridge_fill", "destination_swap"],
};

const TransactionProgress: FC<TransactionProgressProps> = ({
  steps,
  explorerUrls,
  sourceSymbol,
  destinationSymbol,
  sourceLogos,
  destinationLogos,
  hasMultipleSources,
  sources,
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
          // v2: emitted steps have chain, id, or other properties merged in
          return (
            "chain" in st || "id" in st || "explorerURL" in st || "completed" in st
          );
        })
        .map((s) => s?.step?.type)
    );
    const hasAny = (types: string[]) =>
      types.some((t) => completedTypes.has(t));
    const sawAny = (types: string[]) => types.some((t) => eventfulTypes.has(t));

    // v2: intent is verified once the bridge_intent_submission step completes,
    // OR implicitly if any source/destination step is already done
    const intentVerified =
      hasAny(STEP_TYPES.INTENT_VERIFICATION) ||
      hasAny(STEP_TYPES.SOURCE_STEP_TYPES) ||
      hasAny(STEP_TYPES.DESTINATION_STEP_TYPES);

    // If the flow does not include SOURCE_* steps, consider it implicitly collected
    const collectedOnSources =
      (sawAny(STEP_TYPES.SOURCE_STEP_TYPES) &&
        hasAny(STEP_TYPES.SOURCE_TRANSACTION)) ||
      (!sawAny(STEP_TYPES.SOURCE_STEP_TYPES) &&
        hasAny(STEP_TYPES.DESTINATION_STEP_TYPES));

    const filledOnDestination = hasAny(STEP_TYPES.DESTINATION_STEP_TYPES);

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

    // Mark overall completion ONLY when the SDK reports the final destination step
    const done = hasAny(STEP_TYPES.TRANSACTION_COMPLETE);
    const current = displaySteps.findIndex((st) => !st.completed);
    return {
      effectiveSteps: displaySteps,
      currentIndex: current,
      allCompleted: done,
    };
  }, [steps]);

  return (
    <div className="w-full flex flex-col items-start">
      <StepFlow
        steps={effectiveSteps}
        currentIndex={currentIndex}
        totalSteps={effectiveSteps.length}
        sourceLogos={sourceLogos}
        sourceSymbol={sourceSymbol}
        destinationLogos={destinationLogos}
        destinationSymbol={destinationSymbol}
        explorerUrls={explorerUrls}
        allCompleted={allCompleted}
        hasMultipleSources={hasMultipleSources}
        sources={sources}
      />
    </div>
  );
};

export default TransactionProgress;
