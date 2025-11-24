"use client";
import React from "react";
import NetworkToggle from "../helpers/network-toggle";
import { useSearchParams } from "next/navigation";
import { NexusNetwork } from "@avail-project/nexus-core";
import { PreviewPanel } from "../helpers/preview-panel";
import { Toggle } from "../ui/toggle";
import { Check, X } from "lucide-react";

type ElementType =
  | "deposit"
  | "swaps"
  | "fast-bridge"
  | "unified-balance"
  | "fast-transfer"
  | "view-history"
  | "swap-deposit";

const disabledTestnet = new Set<ElementType>([
  "deposit",
  "swaps",
  "swap-deposit",
]);

type ToggleControlProps = Omit<
  React.ComponentProps<typeof Toggle>,
  "children" | "type"
>;

interface ShowcaseWrapperProps extends ToggleControlProps {
  children: React.ReactNode;
  connectLabel?: string;
  type: ElementType;
  toggleLabel?: string;
  toggle?: boolean;
}

const ShowcaseWrapper = ({
  children,
  connectLabel = "Connect wallet to use Nexus",
  type,
  toggle,
  toggleLabel,
  variant = "outline",
  size = "sm",
  pressed,
  defaultPressed,
  onPressedChange,
  ...toggleProps
}: ShowcaseWrapperProps) => {
  const searchParams = useSearchParams();
  const urlNetwork = (searchParams.get("network") || "mainnet") as NexusNetwork;
  const resolvedToggle =
    typeof toggle === "boolean"
      ? toggle
      : pressed !== undefined ||
        defaultPressed !== undefined ||
        onPressedChange !== undefined;
  const isPressed = pressed ?? defaultPressed ?? false;
  const label = toggleLabel ?? "Swap with Exact In";

  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="flex items-center justify-between w-full">
        <NetworkToggle
          currentNetwork={urlNetwork ?? "mainnet"}
          disabled={disabledTestnet.has(type)}
        />
        {resolvedToggle && (
          <Toggle
            variant={variant}
            size={size}
            pressed={pressed}
            defaultPressed={defaultPressed}
            onPressedChange={onPressedChange}
            {...toggleProps}
          >
            <p className="text-sm font-medium">{label}</p>
            {isPressed ? (
              <Check className="size-4" />
            ) : (
              <X className="size-4" />
            )}
          </Toggle>
        )}
      </div>

      <PreviewPanel connectLabel={connectLabel}>{children}</PreviewPanel>
    </div>
  );
};

export default ShowcaseWrapper;
