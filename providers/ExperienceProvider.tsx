"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ExperienceStepType = "bridge" | "xcs" | "swap-execute";

export interface ExperienceStep {
  id: string;
  type: ExperienceStepType;
  title: string;
  action?: string;
}

export type StepStatus = "pending" | "active" | "completed" | "error";

interface ExperienceContextValue {
  steps: ExperienceStep[];
  currentIndex: number;
  currentStep: ExperienceStep;
  statusById: Record<string, StepStatus>;
  dataById: Record<string, unknown>;
  isLastStep: boolean;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  setStepStatus: (stepId: string, status: StepStatus) => void;
  completeCurrent: (data?: unknown) => void;
  setStepData: (stepId: string, data: unknown) => void;
  reset: () => void;
}

const ExperienceContext = createContext<ExperienceContextValue | undefined>(
  undefined
);

function buildDefaultSteps(): ExperienceStep[] {
  return [
    {
      id: "bridge",
      type: "bridge",
      title: "Bridge all USDC (MAX) to Base",
      action: "fast-bridge",
    },
    {
      id: "xcs",
      type: "xcs",
      title: "Swap half your USDC on Base to Eth on Arb",
      action: "swap",
    },
    {
      id: "swap-execute",
      type: "swap-execute",
      title:
        "Swap remaining USDC (MAX) on Base to USDT on Arb and then deposit to AAVE",
      action: "swap-execute",
    },
  ];
}

function getInitialStatuses(
  steps: ExperienceStep[]
): Record<string, StepStatus> {
  const initial: Record<string, StepStatus> = {};
  steps.forEach((s, idx) => {
    initial[s.id] = idx === 0 ? "active" : "pending";
  });
  return initial;
}

export function useExperience(): ExperienceContextValue {
  const ctx = useContext(ExperienceContext);
  if (!ctx)
    throw new Error("useExperience must be used within ExperienceProvider");
  return ctx;
}

export default function ExperienceProvider({
  children,
  initialSteps,
}: Readonly<{ children: React.ReactNode; initialSteps?: ExperienceStep[] }>) {
  const steps = useMemo(
    () => initialSteps ?? buildDefaultSteps(),
    [initialSteps]
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [statusById, setStatusById] = useState<Record<string, StepStatus>>(() =>
    getInitialStatuses(steps)
  );
  const [dataById, setDataById] = useState<Record<string, unknown>>({});

  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;

  const setStepStatus = useCallback((stepId: string, status: StepStatus) => {
    setStatusById((prev) => ({ ...prev, [stepId]: status }));
  }, []);

  const setStepData = useCallback((stepId: string, data: unknown) => {
    setDataById((prev) => ({ ...prev, [stepId]: data }));
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((idx) => {
      const nextIdx = Math.min(idx + 1, steps.length - 1);
      if (nextIdx !== idx) {
        const nextId = steps[nextIdx].id;
        setStatusById((prev) => ({ ...prev, [nextId]: "active" }));
      }
      return nextIdx;
    });
  }, [steps]);

  const prev = useCallback(() => {
    setCurrentIndex((idx) => Math.max(idx - 1, 0));
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const safeIndex = Math.max(0, Math.min(index, steps.length - 1));
      setCurrentIndex(safeIndex);
      const stepId = steps[safeIndex].id;
      setStatusById((prev) => ({
        ...prev,
        [stepId]: prev[stepId] === "completed" ? "completed" : "active",
      }));
    },
    [steps]
  );

  const completeCurrent = useCallback(
    (data?: unknown) => {
      const stepId = steps[currentIndex]?.id;
      if (!stepId) return;
      setStatusById((prev) => ({ ...prev, [stepId]: "completed" }));
      if (data !== undefined)
        setDataById((prev) => ({ ...prev, [stepId]: data }));
      if (currentIndex < steps.length - 1) {
        setCurrentIndex((idx) => idx + 1);
        const nextId = steps[currentIndex + 1].id;
        setStatusById((prev) => ({ ...prev, [nextId]: "active" }));
      }
    },
    [currentIndex, steps]
  );

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setStatusById(getInitialStatuses(steps));
    setDataById({});
  }, [steps]);

  const value: ExperienceContextValue = useMemo(
    () => ({
      steps,
      currentIndex,
      currentStep,
      statusById,
      dataById,
      isLastStep,
      next,
      prev,
      goTo,
      setStepStatus,
      completeCurrent,
      setStepData,
      reset,
    }),
    [
      steps,
      currentIndex,
      currentStep,
      statusById,
      dataById,
      isLastStep,
      next,
      prev,
      goTo,
      setStepStatus,
      completeCurrent,
      setStepData,
      reset,
    ]
  );

  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
}
