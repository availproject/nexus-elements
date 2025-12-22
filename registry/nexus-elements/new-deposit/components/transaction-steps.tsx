"use client";

import { useEffect, useState } from "react";
import { AnimatedSpinner } from "./ui/animated-spinner";
import { CheckIcon } from "./icons";

interface Step {
  id: string;
  label: string;
}

interface TransactionStepsProps {
  steps: Step[];
  totalDuration?: number;
  onComplete?: () => void;
}

type StepStatus = "completed" | "in-progress" | "pending";

export function TransactionSteps({
  steps,
  totalDuration = 12000,
  onComplete,
}: TransactionStepsProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const stepDuration = totalDuration / steps.length;

  useEffect(() => {
    if (currentStepIndex >= steps.length) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setCompletedSteps((prev) =>
        new Set(prev).add(steps[currentStepIndex].id)
      );
      setCurrentStepIndex((prev) => prev + 1);
    }, stepDuration);

    return () => clearTimeout(timer);
  }, [currentStepIndex, steps, stepDuration, onComplete]);

  const getStepStatus = (stepIndex: number, stepId: string): StepStatus => {
    if (completedSteps.has(stepId)) return "completed";
    if (stepIndex === currentStepIndex) return "in-progress";
    return "pending";
  };

  return (
    <div className="flex flex-col px-6">
      {steps.map((step, index) => {
        const status = getStepStatus(index, step.id);
        const isLastStep = index === steps.length - 1;

        return (
          <div
            key={step.id}
            className={`${isLastStep ? "pt-5" : "py-5"} flex gap-4 border-t`}
          >
            <div className="h-6 w-6 flex items-center justify-center">
              {status === "completed" && <CheckIcon className="text-primary" />}
              {status === "in-progress" && (
                <AnimatedSpinner className="h-6 w-6 text-primary" />
              )}
            </div>
            <span className="font-sans text-card-foreground leading-5">
              {step.label}
            </span>
            <span className="ml-auto text-muted-foreground">-</span>
          </div>
        );
      })}
    </div>
  );
}
