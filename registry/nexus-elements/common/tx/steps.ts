// v2: SwapStepType is no longer exported from the SDK — use a local step shape
// that matches v2 SwapPlanStep discriminator pattern
export type SwapStepType = {
  typeID?: string;
  type?: string;
  [key: string]: unknown;
};

import type { GenericStep } from "./types";
import { getStepKey } from "./types";

/**
 * Predefined expected steps for swaps to seed UI before events arrive.
 * Uses v2 stepType names that match SwapPlanProgressEvent.stepType discriminators.
 */
export const SWAP_EXPECTED_STEPS: SwapStepType[] = [
  { type: "source_swap", typeID: "source_swap" },
  { type: "eoa_to_ephemeral_transfer", typeID: "eoa_to_ephemeral_transfer" },
  { type: "bridge_deposit", typeID: "bridge_deposit" },
  { type: "bridge_intent_submission", typeID: "bridge_intent_submission" },
  { type: "bridge_fill", typeID: "bridge_fill" },
  { type: "destination_swap", typeID: "destination_swap" },
];

export function seedSteps<T>(expected: T[]): Array<GenericStep<T>> {
  return expected.map((st, index) => ({
    id: index,
    completed: false,
    step: st,
  }));
}

export function computeAllCompleted<T>(steps: Array<GenericStep<T>>): boolean {
  return steps.length > 0 && steps.every((s) => s.completed);
}

/**
 * Replace the current list of steps with a new list, preserving completion
 * for any steps that were already marked completed (matched by key).
 */
export function mergeStepsList<T>(
  prev: Array<GenericStep<T>>,
  list: T[]
): Array<GenericStep<T>> {
  const completedKeys = new Set<string>();
  for (const prevStep of prev) {
    if (prevStep.completed) {
      completedKeys.add(getStepKey(prevStep.step));
    }
  }
  const next: Array<GenericStep<T>> = [];
  for (let index = 0; index < list.length; index++) {
    const step = list[index];
    const key = getStepKey(step);
    next.push({
      id: index,
      completed: completedKeys.has(key),
      step,
    });
  }
  return next;
}

/**
 * Mark a step complete in-place; if the step doesn't yet exist, append it.
 */
export function mergeStepComplete<T>(
  prev: Array<GenericStep<T>>,
  step: T
): Array<GenericStep<T>> {
  const key = getStepKey(step);
  const updated: Array<GenericStep<T>> = [];
  let found = false;
  for (const s of prev) {
    if (getStepKey(s.step) === key) {
      updated.push({ ...s, completed: true, step: { ...s.step, ...step } });
      found = true;
    } else {
      updated.push(s);
    }
  }
  if (!found) {
    updated.push({
      id: updated.length,
      completed: true,
      step,
    });
  }
  return updated;
}
