import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import { Label } from "../../../ui/label";
import { useMemo } from "react";
import { DESTINATION_SWAP_TOKENS, TOKEN_IMAGES } from "../config/destination";
import { type SUPPORTED_CHAINS_IDS } from "@avail-project/nexus-core";

type TokenInfo = {
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
  tokenAddress: `0x${string}`;
};

interface DestinationTokenSelectProps {
  selectedToken?: TokenInfo;
  selectedChain: SUPPORTED_CHAINS_IDS;
  handleTokenSelect: (token: TokenInfo) => void;
  disabled?: boolean;
  label?: string;
}

const DestinationTokenSelect = ({
  selectedToken,
  selectedChain,
  handleTokenSelect,
  disabled = false,
  label,
}: DestinationTokenSelectProps) => {
  const tokenData = useMemo(() => {
    return DESTINATION_SWAP_TOKENS.get(selectedChain as number) ?? [];
  }, [selectedChain]);

  return (
    <Select
      value={selectedToken?.symbol ?? ""}
      onValueChange={(value) => {
        if (disabled) return;
        const tok = tokenData.find((t) => t.symbol === value);
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
          {tokenData.map((token) => (
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

export default DestinationTokenSelect;
