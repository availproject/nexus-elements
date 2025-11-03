"use client";
import React from "react";
import ExperienceProvider, {
  useExperience,
} from "@/providers/ExperienceProvider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import FastBridge from "@/registry/nexus-elements/fast-bridge/fast-bridge";
import SwapExactIn from "@/registry/nexus-elements/swaps/exact-in/exact-in";
// import SwapExecute from "@/registry/nexus-elements/swaps/exact-in/swap-execute";
import { useAccount } from "wagmi";

function Stepper() {
  const { steps, currentIndex, statusById, goTo } = useExperience();
  return (
    <div className="w-full">
      <div className="flex items-center gap-x-4 overflow-x-auto pb-2">
        {steps.map((s, idx) => {
          const status = statusById[s.id];
          const isActive = idx === currentIndex;
          const isClickable = status === "completed" || idx <= currentIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => isClickable && goTo(idx)}
              className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                isActive
                  ? "border-sky-500 text-sky-600 dark:text-sky-400"
                  : status === "completed"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-muted text-muted-foreground"
              }`}
            >
              <span className="mr-2">{idx + 1}.</span>
              {s.title}
            </button>
          );
        })}
      </div>
      <Separator className="my-3" />
    </div>
  );
}

function StepContent() {
  const { currentStep, completeCurrent } = useExperience();
  const { address } = useAccount();

  if (currentStep.type === "transfer") {
    if (!address) {
      return (
        <p className="text-sm text-muted-foreground">
          Connect your wallet to start the transfer.
        </p>
      );
    }
    return (
      <FastBridge
        connectedAddress={address}
        onComplete={() => completeCurrent()}
      />
    );
  }

  if (currentStep.type === "xcs") {
    // return <SwapExactIn onComplete={() => completeCurrent()} />;
  }

  // return <SwapExecute onComplete={() => completeCurrent()} />;
}

export default function NexusExperience() {
  return (
    <ExperienceProvider>
      <div className="w-full flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Guided Experience</h2>
            <p className="text-sm text-muted-foreground">
              Transfer → XCS → Bridge & Execute
            </p>
          </div>
        </div>

        <Stepper />
        <StepContent />
        <FooterNav />
      </div>
    </ExperienceProvider>
  );
}

function FooterNav() {
  const { prev, next, currentIndex, steps, statusById, isLastStep } =
    useExperience();
  const current = steps[currentIndex];
  const canNext = statusById[current.id] === "completed" && !isLastStep;
  return (
    <div className="flex items-center justify-between pt-2">
      <Button variant="outline" onClick={prev} disabled={currentIndex === 0}>
        Back
      </Button>
      <Button onClick={next} disabled={!canNext}>
        {isLastStep ? "Done" : "Next"}
      </Button>
    </div>
  );
}
