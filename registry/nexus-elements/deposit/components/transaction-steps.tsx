"use client";

import { useEffect, useState } from "react";
import { AnimatedSpinner } from "./ui/animated-spinner";
import { CheckIcon } from "./icons";

interface Step {
  id: string;
  label: string;
  /** If true, this step will be grouped with the next step (no separator, only gap) */
  groupWithNext?: boolean;
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

  // Group steps based on groupWithNext property
  const groupedSteps: Step[][] = [];
  let currentGroup: Step[] = [];

  steps.forEach((step) => {
    currentGroup.push(step);
    if (!step.groupWithNext) {
      groupedSteps.push(currentGroup);
      currentGroup = [];
    }
  });
  if (currentGroup.length > 0) {
    groupedSteps.push(currentGroup);
  }

  return (
    <div className="flex flex-col px-6">
      {groupedSteps.map((group, groupIndex) => {
        const isLastGroup = groupIndex === groupedSteps.length - 1;

        return (
          <div
            key={group[0].id}
            className={`${
              isLastGroup ? "pt-5" : "py-5"
            } flex flex-col gap-5 border-t`}
          >
            {group.map((step) => {
              const stepIndex = steps.findIndex((s) => s.id === step.id);
              const status = getStepStatus(stepIndex, step.id);

              return (
                <div key={step.id} className="flex gap-4">
                  <div className="h-5 w-5 flex items-center justify-center">
                    {status === "completed" && (
                      <CheckIcon className="text-primary" />
                    )}
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
      })}
    </div>
  );
}
