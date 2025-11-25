"use client";

import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface StepIndicatorProps {
  currentStep: 1 | 2;
  stepComplete?: boolean;
}

const STEPS = [
  { id: 1, label: "Swap" },
  { id: 2, label: "Deposit" },
];

export const StepIndicator = ({
  currentStep,
  stepComplete = false,
}: StepIndicatorProps) => {
  const [isMerged, setIsMerged] = useState(false);
  const allComplete = currentStep === 2 && stepComplete;

  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(() => setIsMerged(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsMerged(false);
    }
  }, [allComplete]);

  return (
    <div className="relative flex h-14 items-center justify-center w-full">
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out",
          isMerged
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-50 translate-y-4 pointer-events-none"
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground shadow-[0_0_15px_rgba(34,197,94,0.4)] ring-2 ring-success/20">
          <Check
            className="h-5 w-5 animate-in zoom-in duration-300"
            strokeWidth={3}
          />
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-3 transition-all duration-500 ease-in-out",
          isMerged
            ? "opacity-0 scale-90 blur-sm"
            : "opacity-100 scale-100 blur-0"
        )}
      >
        {STEPS.map((step, index) => {
          const isStepComplete =
            step.id < currentStep || (step.id === currentStep && stepComplete);
          const isStepActive = step.id === currentStep && !stepComplete;

          return (
            <div
              key={step.id}
              className="flex items-center gap-2 text-sm font-medium"
            >
              <div
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300",
                  isStepComplete &&
                    "border-success bg-success text-success-foreground",
                  isStepActive &&
                    "border-primary text-primary ring-2 ring-primary/20",
                  !isStepComplete &&
                    !isStepActive &&
                    "border-border text-muted-foreground"
                )}
              >
                <span className="absolute inset-0 flex items-center justify-center">
                  {isStepComplete && (
                    <Check className="h-4 w-4 animate-in zoom-in duration-300" />
                  )}
                  {isStepActive && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!isStepComplete && !isStepActive && <span>{step.id}</span>}
                </span>
              </div>

              <span
                className={cn(
                  "transition-colors duration-300",
                  isStepComplete && "text-success",
                  isStepActive && "text-foreground",
                  !isStepComplete && !isStepActive && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {index === 0 && (
                <div className="mx-1 h-px w-8 bg-border overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full bg-success transition-transform duration-500 ease-in-out origin-left",
                      currentStep > 1 || (currentStep === 1 && stepComplete)
                        ? "scale-x-100"
                        : "scale-x-0"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
