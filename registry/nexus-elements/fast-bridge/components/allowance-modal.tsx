"use client";
import React, { FC, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  type AllowanceHookSource,
  CHAIN_METADATA,
  type OnAllowanceHookData,
} from "@avail-project/nexus-core";
import { useNexus } from "../../nexus/NexusProvider";

interface AllowanceModalProps {
  allowanceModal: OnAllowanceHookData | null;
  setAllowanceModal: React.Dispatch<
    React.SetStateAction<OnAllowanceHookData | null>
  >;
  callback?: () => void;
  onCloseCallback?: () => void;
}

const AllowanceModal: FC<AllowanceModalProps> = ({
  allowanceModal,
  setAllowanceModal,
  callback,
  onCloseCallback,
}) => {
  const { nexusSDK } = useNexus();
  const [selectedOption, setSelectedOption] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<string[]>([]);

  useEffect(() => {
    if (allowanceModal) {
      setSelectedOption(
        Array.from({ length: allowanceModal.sources.length }, () => "min")
      );
      setCustomValues(
        Array.from({ length: allowanceModal.sources.length }, () => "")
      );
    }
  }, [allowanceModal]);

  if (!allowanceModal) return null;

  const { sources, allow, deny } = allowanceModal;

  const onClose = () => {
    deny();
    setAllowanceModal(null);
    onCloseCallback?.();
  };

  const onApprove = () => {
    const processed = sources.map((_, i) => {
      const opt = selectedOption[i];
      if (opt === "min" || opt === "max") return opt;
      const v = customValues[i];
      if (v && Number.isNaN(v)) return v;
      return "min";
    });
    try {
      allow(processed);
      setAllowanceModal(null);
      callback?.();
    } catch (error) {
      console.error(error);
      onCloseCallback?.();
    }
  };

  return (
    <Dialog
      open={!!allowanceModal}
      onOpenChange={(isOpen) => !isOpen && onClose()}
    >
      <DialogContent className="w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Token Allowances</DialogTitle>
          <DialogDescription>
            Select minimum, maximum, or a custom allowance for each required
            token.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {sources?.map((source: AllowanceHookSource, index: number) => (
            <div
              key={`${source.token.symbol}-${index}`}
              className="p-3 border rounded-lg"
            >
              <div className="flex items-center justify-between gap-x-2">
                <div className="flex items-center gap-x-2">
                  <img
                    src={CHAIN_METADATA[source.chain.id]?.logo}
                    alt={source.chain.name}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <p className="font-semibold">
                    {source.token.symbol} on {source.chain.name}
                  </p>
                </div>
                <div className="text-sm">
                  <span className="mr-1 text-muted-foreground">Current:</span>
                  <span className="font-semibold">
                    {nexusSDK?.utils.formatBalance(
                      source.allowance.current,
                      source.token.decimals
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <Label className="flex items-center gap-x-2">
                  <Input
                    type="radio"
                    name={`allowance-${index}`}
                    value="min"
                    checked={selectedOption[index] === "min"}
                    onChange={() => {
                      const next = [...selectedOption];
                      next[index] = "min";
                      setSelectedOption(next);
                    }}
                    className="w-10"
                  />
                  <span>
                    Minimum (
                    {nexusSDK?.utils.formatBalance(
                      source.allowance.minimum,
                      source.token.decimals
                    )}
                    )
                  </span>
                </Label>

                <Label className="flex items-center gap-x-2">
                  <Input
                    type="radio"
                    name={`allowance-${index}`}
                    value="max"
                    checked={selectedOption[index] === "max"}
                    onChange={() => {
                      const next = [...selectedOption];
                      next[index] = "max";
                      setSelectedOption(next);
                    }}
                    className="w-10"
                  />
                  <span>Maximum (Unlimited)</span>
                </Label>

                <div className="flex items-center gap-x-2">
                  <Input
                    type="radio"
                    name={`allowance-${index}`}
                    value="custom"
                    checked={selectedOption[index] === "custom"}
                    onChange={() => {
                      const next = [...selectedOption];
                      next[index] = "custom";
                      setSelectedOption(next);
                    }}
                    className="w-10"
                  />
                  <Label className="mr-2">Custom Amount</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Enter custom amount"
                    value={
                      selectedOption[index] === "custom"
                        ? customValues[index]
                        : ""
                    }
                    onChange={(e) => {
                      const next = [...customValues];
                      next[index] = e.target.value;
                      setCustomValues(next);
                    }}
                    className="h-8 w-40"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:justify-end mt-2">
          <Button
            variant="destructive"
            onClick={onClose}
            className="font-semibold"
          >
            Deny
          </Button>
          <Button onClick={onApprove} className="font-semibold">
            Approve Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllowanceModal;
