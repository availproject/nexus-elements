"use client";

import { useEffect, useMemo } from "react";
import { AnimatedSpinner } from "../../ui/animated-spinner";
import { CheckIcon } from "./icons";
import type { SwapStepType } from "@avail-project/nexus-core";

interface Step {
  id: number;
  completed: boolean;
  step: SwapStepType;
}

interface TransactionStepsProps {
  steps: Step[];
  timer: string;
  onComplete?: () => void;
}

type StepStatus = "completed" | "in-progress" | "pending";

function getStepLabel(step: SwapStepType): string {
  const type = step.type;
  switch (type) {
    case "SWAP_START":
      return "Swap started";
    case "DETERMINING_SWAP":
      return "Determining swap route";
    case "CREATE_PERMIT_EOA_TO_EPHEMERAL":
      return "Creating permit";
    case "CREATE_PERMIT_FOR_SOURCE_SWAP":
      return "Creating permit for source swap";
    case "SOURCE_SWAP_BATCH_TX":
      return "Source swap batch transaction";
    case "SOURCE_SWAP_HASH":
      return "Source swap transaction";
    case "RFF_ID":
      return "RFF ID generated";
    case "DESTINATION_SWAP_BATCH_TX":
      return "Destination swap batch transaction";
    case "DESTINATION_SWAP_HASH":
      return "Destination swap transaction";
    case "BRIDGE_DEPOSIT":
      return "Bridge deposit";
    case "SWAP_COMPLETE":
      return "Swap complete";
    default:
      return type;
  }
}

export function TransactionSteps({
  steps,
  timer,
  onComplete,
}: TransactionStepsProps) {
  const getStepStatus = (stepIndex: number, stepId: number): StepStatus => {
    const step = steps[stepIndex];
    if (step?.completed) return "completed";
    if (stepIndex === steps.findIndex((s) => !s.completed)) return "in-progress";
    return "pending";
  };

  const groupedSteps = useMemo(() => {
    const groups: Step[][] = [];
    let currentGroup: Step[] = [];

    steps.forEach((step) => {
      currentGroup.push(step);
      const type = step.step.type;
      if (
        type === "SWAP_START" ||
        type === "DETERMINING_SWAP" ||
        type === "SWAP_COMPLETE"
      ) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }, [steps]);

  useEffect(() => {
    if (steps.length > 0 && steps.every((s) => s.completed)) {
      onComplete?.();
    }
  }, [steps, onComplete]);

  return (
    <div className="flex flex-col px-6">
      <div className="flex justify-end py-2 text-sm text-muted-foreground font-mono">
        {timer}
      </div>
      {groupedSteps.map((group, groupIndex) => {
        const isLastGroup = groupIndex === groupedSteps.length - 1;

        return (
          <div
            key={`${group[0].id}-${group[0].step.type}`}
            className={`${
              isLastGroup ? "pt-5" : "py-5"
            } flex flex-col gap-5 border-t`}
          >
            {group.map((step, index) => {
              const stepIndex = steps.findIndex(
                (s) => s.id === step.id && s.step.type === step.step.type,
              );
              const status = getStepStatus(stepIndex, step.id);
              const label = getStepLabel(step.step);

              return (
                <div key={`${step.id}-${step.step.type}`} className="flex gap-4">
                  <div className="h-5 w-5 flex items-center justify-center">
                    {status === "completed" && (
                      <CheckIcon className="text-primary" />
                    )}
                    {status === "in-progress" && (
                      <AnimatedSpinner className="h-6 w-6 text-primary" />
                    )}
                    {status === "pending" && (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>
                  <span className="font-sans text-card-foreground leading-5">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
