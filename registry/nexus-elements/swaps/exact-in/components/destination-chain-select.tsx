import React, { FC, useMemo } from "react";
import { Label } from "../../../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import {
  type SUPPORTED_CHAINS_IDS,
  CHAIN_METADATA,
} from "@avail-project/nexus-core";
import { cn } from "@/lib/utils";
import { DESTINATION_SWAP_TOKENS } from "../config/destination";

interface DestinationChainSelectProps {
  selectedChain: number;
  disabled?: boolean;
  hidden?: boolean;
  className?: string;
  label?: string;
  handleSelect: (chainId: SUPPORTED_CHAINS_IDS) => void;
}

const DestinationChainSelect: FC<DestinationChainSelectProps> = ({
  selectedChain,
  disabled,
  hidden = false,
  className,
  label,
  handleSelect,
}) => {
  const chains = useMemo(() => Array.from(DESTINATION_SWAP_TOKENS.keys()), []);
  const selectedChainMeta = useMemo(
    () => CHAIN_METADATA[selectedChain],
    [selectedChain]
  );

  if (hidden) return null;
  return (
    <Select
      value={selectedChain?.toString() ?? ""}
      onValueChange={(value) => {
        if (!disabled) {
          handleSelect(Number.parseInt(value) as SUPPORTED_CHAINS_IDS);
        }
      }}
    >
      <div className="flex flex-col items-start gap-y-1 w-full">
        {label && <Label className="text-sm font-semibold">{label}</Label>}
        <SelectTrigger disabled={disabled} className=" w-full">
          <SelectValue>
            {selectedChainMeta && (
              <div
                className={cn("flex items-center gap-x-2 w-full", className)}
              >
                <img
                  src={selectedChainMeta?.logo}
                  alt={selectedChainMeta?.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <p className="text-primary test-sm">
                  {selectedChainMeta?.name}
                </p>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
      </div>

      <SelectContent>
        <SelectGroup>
          {chains.map((chainId) => {
            const meta = CHAIN_METADATA[chainId as SUPPORTED_CHAINS_IDS];
            return (
              <SelectItem key={chainId} value={String(chainId)}>
                <div className="flex items-center gap-x-2 my-1">
                  <img
                    src={meta.logo}
                    alt={meta?.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <p className="text-primary test-sm">{meta.name}</p>
                </div>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default DestinationChainSelect;
