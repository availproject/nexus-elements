import {
  NEXUS_EVENTS,
  NexusSDK,
  type ProgressStep,
} from "@avail-project/nexus-core";
import { useEffect, useMemo, useRef, useState } from "react";

type ProcessingState = Array<{
  id: number;
  completed: boolean;
  step: ProgressStep;
}>;

const useListenTransaction = (
  sdk: NexusSDK | null,
  transactionType: "bridge" | "transfer" | "bridgeAndExecute" = "bridge"
) => {
  const [processing, setProcessing] = useState<ProcessingState>([]);
  const [explorerUrl, setExplorerUrl] = useState("");
  const [latestCompleted, setLatestCompleted] = useState<ProgressStep | null>(
    null
  );

  useEffect(() => {
    if (!sdk) return;

    const completedIds = new Set<string>();
    const firstEmissionRef = { current: true } as const;
    let rafId: number | null = null;

    const handleExpectedSteps = (expectedSteps: ProgressStep[]) => {
      console.log("expected steps", expectedSteps);
      const stepsArray = Array.isArray(expectedSteps) ? expectedSteps : [];
      const apply = () =>
        setProcessing((prev) => {
          prev.forEach((s) => {
            if (s?.completed && s?.step?.typeID)
              completedIds.add(s.step.typeID);
          });
          const next: ProcessingState = stepsArray.map((step, index) => ({
            id: index,
            completed: completedIds.has(step?.typeID ?? ""),
            step,
          }));
          return next;
        });

      if (firstEmissionRef.current) {
        // @ts-expect-error - mutating readonly-like for local pattern
        firstEmissionRef.current = false;
        apply();
      } else {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(apply);
      }
    };

    const handleStepComplete = (stepData: ProgressStep) => {
      console.log("completed stepData", stepData);
      if (stepData?.typeID) completedIds.add(stepData.typeID);
      setProcessing((prev) =>
        prev.map((s) =>
          s.step && s.step.typeID === stepData?.typeID
            ? { ...s, completed: true }
            : s
        )
      );

      setLatestCompleted(stepData);

      if (
        stepData?.typeID === "IS" &&
        stepData?.data &&
        "explorerURL" in stepData.data
      ) {
        setExplorerUrl(stepData?.data?.explorerURL);
      }
    };
    const exepectedEvent =
      transactionType === "bridgeAndExecute"
        ? NEXUS_EVENTS.BRIDGE_EXECUTE_EXPECTED_STEPS
        : NEXUS_EVENTS.EXPECTED_STEPS;
    const completeEvent =
      transactionType === "bridgeAndExecute"
        ? NEXUS_EVENTS.BRIDGE_EXECUTE_COMPLETED_STEPS
        : NEXUS_EVENTS.STEP_COMPLETE;
    sdk?.nexusEvents?.on(exepectedEvent, handleExpectedSteps);
    sdk?.nexusEvents?.on(completeEvent, handleStepComplete);
    return () => {
      sdk?.nexusEvents?.off(exepectedEvent, handleExpectedSteps);
      sdk?.nexusEvents?.off(completeEvent, handleStepComplete);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [sdk]);

  const latestCompletedIndex = useMemo(() => {
    if (!processing?.length) return -1;
    for (let i = processing.length - 1; i >= 0; i -= 1) {
      if (processing[i]?.completed) return i;
    }
    return -1;
  }, [processing]);

  return { processing, latestCompleted, latestCompletedIndex, explorerUrl };
};

export default useListenTransaction;
