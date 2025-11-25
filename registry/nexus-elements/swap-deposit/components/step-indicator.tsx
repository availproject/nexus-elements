"use client";

import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: 1 | 2;
  step1Complete?: boolean;
}

export const StepIndicator = ({
  currentStep,
  step1Complete = false,
}: StepIndicatorProps) => {
  const steps = [
    { id: 1, label: "Swap" },
    { id: 2, label: "Deposit" },
  ];

  return (
    <div className="flex items-center justify-center gap-4">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isComplete = step.id === 1 && step1Complete;
        return (
          <div
            key={step.id}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border",
                isComplete
                  ? "border-success text-success"
                  : isActive
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground"
              )}
            >
              {step.id}
            </span>
            <span
              className={cn(
                isComplete
                  ? "text-success"
                  : isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            {index === 0 && (
              <span className="h-px w-10 bg-border" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
};

