import { type SUPPORTED_CHAINS_IDS } from "@avail-project/nexus-core";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import { Label } from "../../../ui/label";
import { useNexus } from "../../../nexus/NexusProvider";
import { useMemo } from "react";
import { TOKEN_IMAGES } from "../config/destination";

type SourceTokenInfo = {
  contractAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
};

interface SourceTokenSelectProps {
  selectedToken?: SourceTokenInfo;
  selectedChain: SUPPORTED_CHAINS_IDS;
  handleTokenSelect: (token: SourceTokenInfo) => void;
  disabled?: boolean;
  label?: string;
}

const SourceTokenSelect = ({
  selectedToken,
  selectedChain,
  handleTokenSelect,
  disabled = false,
  label,
}: SourceTokenSelectProps) => {
  const { swapSupportedChainsAndTokens } = useNexus();
  const tokenData: SourceTokenInfo[] | undefined = useMemo(() => {
    console.log("swapSupportedChainsAndTokens", swapSupportedChainsAndTokens);
    return swapSupportedChainsAndTokens?.find(
      (c: any) => c.id === selectedChain
    )?.tokens;
  }, [selectedChain, swapSupportedChainsAndTokens]);

  return (
    <Select
      value={selectedToken?.symbol ?? ""}
      onValueChange={(value) => {
        if (disabled) return;
        const tok = tokenData?.find((t) => t.symbol === value);
        if (tok) handleTokenSelect(tok);
      }}
    >
      <div className="flex flex-col items-start gap-y-1">
        {label && <Label className="text-sm font-semibold">{label}</Label>}
        <SelectTrigger disabled={disabled} className="w-full">
          <SelectValue placeholder="Select a token" className="w-full">
            {selectedChain && selectedToken ? (
              <div className="flex items-center gap-x-2 w-full">
                {selectedToken.symbol ? (
                  <img
                    src={TOKEN_IMAGES[selectedToken?.symbol]}
                    alt={selectedToken.symbol}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : null}
                {selectedToken.symbol}
              </div>
            ) : null}
          </SelectValue>
        </SelectTrigger>
      </div>

      <SelectContent>
        <SelectGroup>
          {tokenData?.map((token) => (
            <SelectItem key={token.symbol} value={token.symbol}>
              <div className="flex items-center gap-x-2 my-1">
                {token.symbol ? (
                  <img
                    src={TOKEN_IMAGES[token?.symbol]}
                    alt={token.symbol}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : null}
                <div className="flex flex-col">
                  <span>{token.symbol}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default SourceTokenSelect;
