import {
  NEXUS_EVENTS,
  NexusSDK,
  type ProgressStep,
} from "@avail-project/nexus-core";
import { useEffect, useMemo, useState } from "react";

type ProcessingState = Array<{
  id: number;
  completed: boolean;
  step: ProgressStep;
}>;

const useListenTransaction = (sdk: NexusSDK | null) => {
  const [processing, setProcessing] = useState<ProcessingState>([]);
  const [explorerUrl, setExplorerUrl] = useState("");
  const [latestCompleted, setLatestCompleted] = useState<ProgressStep | null>(
    null,
  );

  useEffect(() => {
    if (!sdk) return;

    const handleExpectedSteps = (expectedSteps: ProgressStep[]) => {
      const stepsArray = Array.isArray(expectedSteps) ? expectedSteps : [];
      const initialSteps: ProcessingState = stepsArray.map((step, index) => ({
        id: index,
        completed: false,
        step,
      }));
      setProcessing(initialSteps);
    };

    const handleStepComplete = (stepData: ProgressStep) => {
      setProcessing((prev) =>
        prev.map((s) =>
          s.step && s.step.typeID === stepData?.typeID
            ? { ...s, completed: true }
            : s,
        ),
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

    sdk?.nexusEvents?.on(NEXUS_EVENTS.EXPECTED_STEPS, handleExpectedSteps);
    sdk?.nexusEvents?.on(NEXUS_EVENTS.STEP_COMPLETE, handleStepComplete);
    return () => {
      sdk?.nexusEvents?.off(NEXUS_EVENTS.EXPECTED_STEPS, handleExpectedSteps);
      sdk?.nexusEvents?.off(NEXUS_EVENTS.STEP_COMPLETE, handleStepComplete);
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
