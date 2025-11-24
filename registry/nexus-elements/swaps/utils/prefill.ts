import type {
  SUPPORTED_CHAINS_IDS,
  UserAsset,
} from "@avail-project/nexus-core";
import { DESTINATION_SWAP_TOKENS, TOKEN_IMAGES } from "../config/destination";

export function resolveSourceFromPrefill(
  unifiedBalance: UserAsset[] | null | undefined,
  fromChainID: SUPPORTED_CHAINS_IDS | undefined,
  prefillTokenAddress: string | undefined
):
  | {
      contractAddress: `0x${string}`;
      decimals: number;
      logo: string;
      name: string;
      symbol: string;
    }
  | undefined {
  if (!unifiedBalance || !fromChainID || !prefillTokenAddress) return undefined;
  const targetAddr = prefillTokenAddress.toLowerCase();
  for (const a of unifiedBalance) {
    const candidate = a.breakdown?.find(
      (b) =>
        b.contractAddress?.toLowerCase() === targetAddr &&
        (b.chain?.id as number | undefined) === fromChainID
    ) as
      | {
          chain?: { id?: number };
          contractAddress: `0x${string}`;
          decimals?: number;
        }
      | undefined;
    if (candidate) {
      return {
        contractAddress: candidate.contractAddress,
        decimals: candidate.decimals ?? a.decimals,
        logo: TOKEN_IMAGES[a.symbol] ?? "",
        name: a.symbol,
        symbol: a.symbol,
      };
    }
  }
  return undefined;
}

export function resolveDestinationFromPrefill(
  toChainID: SUPPORTED_CHAINS_IDS | undefined,
  prefillTokenAddress: string | undefined
):
  | {
      tokenAddress: `0x${string}`;
      decimals: number;
      logo: string;
      name: string;
      symbol: string;
    }
  | undefined {
  if (!toChainID || !prefillTokenAddress) return undefined;
  const list = DESTINATION_SWAP_TOKENS.get(toChainID);
  const targetAddr = prefillTokenAddress.toLowerCase();
  return list?.find((t) => t.tokenAddress?.toLowerCase() === targetAddr);
}
