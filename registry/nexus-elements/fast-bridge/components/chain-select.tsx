import * as React from "react";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { SUPPORTED_CHAINS_IDS } from "@avail-project/nexus";
import { useNexus } from "../provider/NexusProvider";
import { cn } from "@/lib/utils";
import { ChainSelectProps } from "../types";

const ChainSelect: React.FC<ChainSelectProps> = ({
  selectedChain,
  disabled,
  hidden = false,
  className,
  label,
  handleSelect,
}) => {
  const { supportedChainsAndTokens } = useNexus();
  if (hidden) return null;
  const selectedChainData = React.useMemo(() => {
    if (!supportedChainsAndTokens) return null;
    return supportedChainsAndTokens.find((c) => c.id === selectedChain);
  }, [selectedChain, supportedChainsAndTokens]);
  return (
    <Select
      value={selectedChain?.toString() ?? ""}
      onValueChange={(value) => {
        if (!disabled) {
          handleSelect(parseInt(value) as SUPPORTED_CHAINS_IDS);
        }
      }}
    >
      <div className="flex flex-col items-start gap-y-1 w-full">
        {label && <Label className="text-sm font-semibold">{label}</Label>}
        <SelectTrigger disabled={disabled} className=" w-full">
          <SelectValue>
            {selectedChainData && (
              <div
                className={cn("flex items-center gap-x-2 w-full", className)}
              >
                <img
                  src={selectedChainData?.logo}
                  alt={selectedChainData?.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <p className="text-primary test-sm">
                  {selectedChainData?.name}
                </p>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
      </div>

      <SelectContent>
        <SelectGroup>
          {supportedChainsAndTokens &&
            supportedChainsAndTokens.map((chain) => {
              return (
                <SelectItem key={chain.id} value={String(chain.id)}>
                  <div className="flex items-center gap-x-2 my-1">
                    <img
                      src={chain.logo}
                      alt={chain?.name}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                    <p className="text-primary test-sm">{chain.name}</p>
                  </div>
                </SelectItem>
              );
            })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default ChainSelect;
