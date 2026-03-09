import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { STABLECOIN_SYMBOLS } from "./constants/widget";
import {
  CHAIN_METADATA,
  sortSourcesByPriority,
  UserAsset,
} from "@avail-project/nexus-core";
import { AssetFilterType, DestinationConfig, Token } from "./types";
import { Hex, padHex } from "viem";
import { formatUsdForDisplay } from "../common";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseNonNegativeNumber(value: unknown): number {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

/**
 * Parse currency input by removing $ and commas, keeping only numbers and decimal
 */
export function parseCurrencyInput(input: string): string {
  return input.replace(/[^0-9.]/g, "");
}

export function isStablecoin(symbol: string): boolean {
  return STABLECOIN_SYMBOLS.includes(
    symbol as (typeof STABLECOIN_SYMBOLS)[number],
  );
}

export function isNative(symbol: string): boolean {
  return Object.values(CHAIN_METADATA).some(
    (chain) => chain.nativeCurrency.symbol === symbol,
  );
}

/**
 * Get checkbox state for a token based on selected chains
 */
export function getTokenCheckState(
  token: Token,
  selectedChainIds: Set<string>,
): boolean | "indeterminate" {
  const selectedChainCount = token.chains.filter((c) =>
    selectedChainIds.has(c.id),
  ).length;

  if (selectedChainCount === 0) return false;
  if (selectedChainCount === token.chains.length) return true;
  return "indeterminate";
}

/**
 * Check if current selection matches a preset filter
 * Returns the matching filter type or "custom"
 */
export function checkIfMatchesPreset(
  tokens: Token[],
  selectedChainIds: Set<string>,
): AssetFilterType {
  if (selectedChainIds.size === 0) return "custom";

  const allIds = new Set<string>();
  const stableIds = new Set<string>();
  const nativeIds = new Set<string>();

  tokens.forEach((token) => {
    token.chains.forEach((chain) => {
      allIds.add(chain.id);
      if (isStablecoin(token.symbol)) {
        stableIds.add(chain.id);
      }
      if (isNative(token.symbol)) {
        nativeIds.add(chain.id);
      }
    });
  });

  const setsEqual = (a: Set<string>, b: Set<string>) =>
    a.size === b.size && [...a].every((id) => b.has(id));

  if (setsEqual(selectedChainIds, allIds)) return "all";
  if (setsEqual(selectedChainIds, stableIds)) return "stablecoins";
  if (setsEqual(selectedChainIds, nativeIds)) return "native";
  return "custom";
}

/**
 * Get chain IDs for a preset filter
 */
export function getChainIdsForFilter(
  tokens: Token[],
  filter: "all" | "stablecoins" | "native",
): Set<string> {
  const ids = new Set<string>();
  tokens.forEach((token) => {
    const shouldInclude =
      filter === "all" ||
      (filter === "stablecoins" && isStablecoin(token.symbol)) ||
      (filter === "native" && isNative(token.symbol));

    if (shouldInclude) {
      token.chains.forEach((chain) => ids.add(chain.id));
    }
  });
  return ids;
}

/**
 * Calculate total USD value for selected chain IDs
 */
export function calculateSelectedAmount(
  tokens: Token[],
  selectedChainIds: Set<string>,
): number {
  let total = 0;
  tokens.forEach((token) => {
    token.chains.forEach((chain) => {
      if (selectedChainIds.has(chain.id)) {
        total += chain.usdValue;
      }
    });
  });
  return total;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EVM_NATIVE_PLACEHOLDER = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const MAX_PRIORITY_RANK = Number.MAX_SAFE_INTEGER;
const DEPOSIT_SOURCE_DEBUG_PREFIX = "[nexus-deposit:sources]";

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function toComparableSdkAddress(address: string): string {
  const normalized = normalizeAddress(address);
  const effectiveAddress =
    normalized === ZERO_ADDRESS ? EVM_NATIVE_PLACEHOLDER : normalized;

  try {
    return padHex(effectiveAddress as Hex, { size: 32 }).toLowerCase();
  } catch {
    return effectiveAddress;
  }
}

export function getFiatLookupKey(
  tokenAddress: string,
  chainId: number,
): string {
  return `${normalizeAddress(tokenAddress)}-${chainId}`;
}

export function getPriorityLookupKey(
  tokenAddress: string,
  chainId: number,
): string {
  return `${toComparableSdkAddress(tokenAddress)}-${chainId}`;
}

interface SourceCandidate {
  sourceId: string;
  balanceInFiat: number;
  priorityRank: number;
}

type SourceDebugEntry = {
  sourceId: string;
  chainId: number;
  tokenAddress: Hex;
  symbol: string | null;
  balance: string | null;
  balanceInFiat: number;
  priorityRank: number | null;
};

export function logDepositSourceSelection(
  context: string,
  payload: Record<string, unknown>,
) {
  console.log(DEPOSIT_SOURCE_DEBUG_PREFIX, context, payload);
}

export interface DepositSourceDebugSummary {
  sourceId: string;
  chainId: number;
  chainName: string;
  tokenAddress: Hex;
  assetSymbol: string;
  breakdownSymbol: string;
  balance: string;
  balanceInFiat: number;
  missingFromSwapBalance?: boolean;
}

export function parseSourceId(sourceId: string): {
  tokenAddress: Hex;
  chainId: number;
} | null {
  const separatorIndex = sourceId.lastIndexOf("-");
  if (separatorIndex <= 0) return null;

  const tokenAddress = sourceId.slice(0, separatorIndex) as Hex;
  const chainId = Number.parseInt(sourceId.slice(separatorIndex + 1), 10);
  if (!Number.isInteger(chainId) || chainId <= 0) return null;

  return { tokenAddress, chainId };
}

function buildSourceFiatByKeyMap(
  swapBalance: UserAsset[] | null,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!swapBalance) return map;

  for (const asset of swapBalance) {
    for (const breakdown of asset.breakdown ?? []) {
      const chainId = breakdown.chain?.id;
      const tokenAddress = breakdown.contractAddress;
      if (!chainId || !tokenAddress) continue;

      const balanceInFiat = parseNonNegativeNumber(breakdown.balanceInFiat);

      map.set(getFiatLookupKey(tokenAddress, chainId), balanceInFiat);
    }
  }

  return map;
}

function buildSourceDebugEntries(params: {
  sourceIds: Iterable<string>;
  swapBalance: UserAsset[] | null;
  sourceFiatByKeyMap?: Map<string, number>;
  priorityRankMap?: Map<string, number>;
}): SourceDebugEntry[] {
  const { sourceIds, swapBalance, sourceFiatByKeyMap, priorityRankMap } = params;
  const detailsByFiatKey = new Map<
    string,
    {
      symbol: string | null;
      balance: string | null;
    }
  >();

  for (const asset of swapBalance ?? []) {
    for (const breakdown of asset.breakdown ?? []) {
      const chainId = breakdown.chain?.id;
      const tokenAddress = breakdown.contractAddress;
      if (!chainId || !tokenAddress) continue;

      detailsByFiatKey.set(getFiatLookupKey(tokenAddress, chainId), {
        symbol: breakdown.symbol ?? asset.symbol ?? null,
        balance: breakdown.balance ?? asset.balance ?? null,
      });
    }
  }

  return [...new Set(sourceIds)]
    .map<SourceDebugEntry | null>((sourceId) => {
      const parsed = parseSourceId(sourceId);
      if (!parsed) return null;

      const fiatKey = getFiatLookupKey(parsed.tokenAddress, parsed.chainId);
      const priorityKey = getPriorityLookupKey(
        parsed.tokenAddress,
        parsed.chainId,
      );
      const details = detailsByFiatKey.get(fiatKey);

      return {
        sourceId,
        chainId: parsed.chainId,
        tokenAddress: parsed.tokenAddress,
        symbol: details?.symbol ?? null,
        balance: details?.balance ?? null,
        balanceInFiat: sourceFiatByKeyMap?.get(fiatKey) ?? 0,
        priorityRank: priorityRankMap?.get(priorityKey) ?? null,
      };
    })
    .filter((entry): entry is SourceDebugEntry => entry !== null);
}

function buildSourceDebugSummaryMap(
  swapBalance: UserAsset[] | null,
): Map<string, DepositSourceDebugSummary> {
  const map = new Map<string, DepositSourceDebugSummary>();
  if (!swapBalance) return map;

  for (const asset of swapBalance) {
    for (const breakdown of asset.breakdown ?? []) {
      const chainId = breakdown.chain?.id;
      const tokenAddress = breakdown.contractAddress as Hex | undefined;
      if (!chainId || !tokenAddress) continue;

      const sourceId = `${tokenAddress}-${chainId}`;
      map.set(sourceId, {
        sourceId,
        chainId,
        chainName: breakdown.chain?.name ?? `Chain ${chainId}`,
        tokenAddress,
        assetSymbol: asset.symbol,
        breakdownSymbol: breakdown.symbol,
        balance: breakdown.balance ?? "0",
        balanceInFiat: parseNonNegativeNumber(breakdown.balanceInFiat),
      });
    }
  }

  return map;
}

function buildPriorityRankMap(
  swapBalance: UserAsset[] | null,
  destination: Pick<
    DestinationConfig,
    "chainId" | "tokenAddress" | "tokenSymbol"
  >,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!swapBalance?.length) return map;

  const sortedSources = sortSourcesByPriority(swapBalance, {
    chainID: destination.chainId,
    tokenAddress: destination.tokenAddress,
    symbol: destination.tokenSymbol,
  });

  sortedSources.forEach((source, index) => {
    map.set(getPriorityLookupKey(source.tokenAddress, source.chainID), index);
  });

  return map;
}

function sortSourceIdsByPriority(params: {
  sourceIds: Iterable<string>;
  swapBalance: UserAsset[] | null;
  destination: Pick<
    DestinationConfig,
    "chainId" | "tokenAddress" | "tokenSymbol"
  >;
  minimumBalanceUsd?: number;
}): string[] {
  return buildSortedSourceCandidates(params).map((item) => item.sourceId);
}

function buildSortedSourceCandidates(params: {
  sourceIds: Iterable<string>;
  swapBalance: UserAsset[] | null;
  destination: Pick<
    DestinationConfig,
    "chainId" | "tokenAddress" | "tokenSymbol"
  >;
  minimumBalanceUsd?: number;
}): SourceCandidate[] {
  const { sourceIds, swapBalance, destination, minimumBalanceUsd } = params;
  const uniqueIds = [...new Set(sourceIds)];
  if (uniqueIds.length === 0) return [];

  const sourceFiatByKeyMap = buildSourceFiatByKeyMap(swapBalance);
  const priorityRankMap = buildPriorityRankMap(swapBalance, destination);

  return uniqueIds
    .map((sourceId) => {
      const parsed = parseSourceId(sourceId);
      if (!parsed) return null;

      const fiatKey = getFiatLookupKey(parsed.tokenAddress, parsed.chainId);
      const priorityKey = getPriorityLookupKey(
        parsed.tokenAddress,
        parsed.chainId,
      );
      const balanceInFiat = sourceFiatByKeyMap.get(fiatKey) ?? 0;
      const priorityRank =
        priorityRankMap.get(priorityKey) ?? MAX_PRIORITY_RANK;

      return {
        sourceId,
        balanceInFiat,
        priorityRank,
      };
    })
    .filter((item): item is NonNullable<typeof item> => {
      if (!item) return false;
      if (minimumBalanceUsd == null) return true;
      return item.balanceInFiat >= minimumBalanceUsd;
    })
    .sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) {
        return a.priorityRank - b.priorityRank;
      }
      if (a.balanceInFiat !== b.balanceInFiat) {
        return b.balanceInFiat - a.balanceInFiat;
      }
      return a.sourceId.localeCompare(b.sourceId);
    });
}

export function summarizeSwapBalanceSources(
  swapBalance: UserAsset[] | null,
): DepositSourceDebugSummary[] {
  return [...buildSourceDebugSummaryMap(swapBalance).values()].sort((a, b) => {
    if (a.balanceInFiat !== b.balanceInFiat) {
      return b.balanceInFiat - a.balanceInFiat;
    }
    return a.sourceId.localeCompare(b.sourceId);
  });
}

export function summarizeSourceIds(
  sourceIds: Iterable<string>,
  swapBalance: UserAsset[] | null,
): DepositSourceDebugSummary[] {
  const sourceDebugSummaryMap = buildSourceDebugSummaryMap(swapBalance);

  return [...new Set(sourceIds)]
    .map((sourceId) => {
      const summary = sourceDebugSummaryMap.get(sourceId);
      if (summary) return summary;

      const parsed = parseSourceId(sourceId);
      return {
        sourceId,
        chainId: parsed?.chainId ?? -1,
        chainName:
          parsed?.chainId != null ? `Chain ${parsed.chainId}` : "Unknown chain",
        tokenAddress:
          parsed?.tokenAddress ??
          ("0x0000000000000000000000000000000000000000" as Hex),
        assetSymbol: "UNKNOWN",
        breakdownSymbol: "UNKNOWN",
        balance: "0",
        balanceInFiat: 0,
        missingFromSwapBalance: true,
      };
    })
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

export function summarizeSourceCandidates(params: {
  sourceIds: Iterable<string>;
  swapBalance: UserAsset[] | null;
  destination: Pick<
    DestinationConfig,
    "chainId" | "tokenAddress" | "tokenSymbol"
  >;
  minimumBalanceUsd?: number;
}): Array<
  DepositSourceDebugSummary & {
    priorityRank: number;
  }
> {
  const sourceDebugSummaryMap = buildSourceDebugSummaryMap(params.swapBalance);

  return buildSortedSourceCandidates(params).map((candidate) => {
    const summary = sourceDebugSummaryMap.get(candidate.sourceId);
    if (summary) {
      return {
        ...summary,
        priorityRank: candidate.priorityRank,
      };
    }

    const parsed = parseSourceId(candidate.sourceId);
    return {
      sourceId: candidate.sourceId,
      chainId: parsed?.chainId ?? -1,
      chainName:
        parsed?.chainId != null ? `Chain ${parsed.chainId}` : "Unknown chain",
      tokenAddress:
        parsed?.tokenAddress ??
        ("0x0000000000000000000000000000000000000000" as Hex),
      assetSymbol: "UNKNOWN",
      breakdownSymbol: "UNKNOWN",
      balance: "0",
      balanceInFiat: candidate.balanceInFiat,
      missingFromSwapBalance: true,
      priorityRank: candidate.priorityRank,
    };
  });
}

export function buildDepositSourcePoolIds(params: {
  swapBalance: UserAsset[] | null;
  filter: AssetFilterType;
  selectedSourceIds: Iterable<string>;
  isManualSelection: boolean;
}): string[] {
  const { swapBalance, filter, selectedSourceIds, isManualSelection } = params;
  const selectedSourceIdSet = new Set(selectedSourceIds);

  if (isManualSelection) {
    return [...selectedSourceIdSet];
  }

  const sourceIds = new Set<string>();

  swapBalance?.forEach((asset) => {
    asset.breakdown?.forEach((breakdown) => {
      const chainId = breakdown.chain?.id;
      const tokenAddress = breakdown.contractAddress;
      if (!chainId || !tokenAddress) return;

      const stable = isStablecoin(breakdown.symbol);
      const native = isNative(breakdown.symbol);
      const sourceId = `${tokenAddress}-${chainId}`;
      const include =
        filter === "all" ||
        (filter === "stablecoins" && stable) ||
        (filter === "native" && native) ||
        (filter === "custom" && selectedSourceIdSet.has(sourceId));

      if (include) {
        sourceIds.add(sourceId);
      }
    });
  });

  return [...sourceIds];
}

export interface ResolvedDepositSourceSelection {
  sourcePoolIds: string[];
  selectedSourceIds: string[];
  fromSources: Array<{ tokenAddress: Hex; chainId: number }>;
}

export function resolveDepositSourceSelection(params: {
  swapBalance: UserAsset[] | null;
  destination: Pick<
    DestinationConfig,
    "chainId" | "tokenAddress" | "tokenSymbol"
  >;
  filter: AssetFilterType;
  selectedSourceIds: Iterable<string>;
  isManualSelection: boolean;
  minimumBalanceUsd: number;
  targetAmountUsd?: number;
}): ResolvedDepositSourceSelection {
  const {
    swapBalance,
    destination,
    filter,
    selectedSourceIds,
    isManualSelection,
    minimumBalanceUsd,
    targetAmountUsd,
  } = params;

  const sourcePoolIds = buildDepositSourcePoolIds({
    swapBalance,
    filter,
    selectedSourceIds,
    isManualSelection,
  });

  const resolvedSelectedSourceIds = isManualSelection
    ? sortSourceIdsByPriority({
        sourceIds: sourcePoolIds,
        swapBalance,
        destination,
        minimumBalanceUsd,
      })
    : buildPrioritySelectedSourceIds({
        swapBalance,
        destination,
        minimumBalanceUsd,
        targetAmountUsd,
        sourceIds: sourcePoolIds,
      });

  const fromSources = buildSortedFromSources({
    sourceIds: resolvedSelectedSourceIds,
    swapBalance,
    destination,
    minimumBalanceUsd,
  });

  return {
    sourcePoolIds,
    selectedSourceIds: resolvedSelectedSourceIds,
    fromSources,
  };
}

export function buildSelectableSourceIds(params: {
  swapBalance: UserAsset[] | null;
  destination: Pick<
    DestinationConfig,
    "chainId" | "tokenAddress" | "tokenSymbol"
  >;
  minimumBalanceUsd: number;
  debugContext?: string;
}): string[] {
  const { swapBalance, destination, minimumBalanceUsd } = params;
  const sourceIds = new Set<string>();

  if (!swapBalance) return [];

  for (const asset of swapBalance) {
    for (const breakdown of asset.breakdown ?? []) {
      const chainId = breakdown.chain?.id;
      const tokenAddress = breakdown.contractAddress;
      if (!chainId || !tokenAddress) continue;

      sourceIds.add(`${tokenAddress}-${chainId}`);
    }
  }

  return sortSourceIdsByPriority({
    sourceIds,
    swapBalance,
    destination,
    minimumBalanceUsd,
  });
}

export function buildPrioritySelectedSourceIds(params: {
  swapBalance: UserAsset[] | null;
  destination: Pick<
    DestinationConfig,
    "chainId" | "tokenAddress" | "tokenSymbol"
  >;
  minimumBalanceUsd: number;
  targetAmountUsd?: number;
  sourceIds?: Iterable<string>;
  debugContext?: string;
}): string[] {
  const {
    swapBalance,
    destination,
    minimumBalanceUsd,
    targetAmountUsd,
    sourceIds,
    debugContext,
  } = params;

  const requestedSourceIds = sourceIds ? [...new Set(sourceIds)] : undefined;
  const orderedCandidateSourceIds = requestedSourceIds
    ? sortSourceIdsByPriority({
        sourceIds: requestedSourceIds,
        swapBalance,
        destination,
        minimumBalanceUsd,
      })
    : buildSelectableSourceIds({
        swapBalance,
        destination,
        minimumBalanceUsd,
        debugContext:
          debugContext != null ? `${debugContext}:all-selectable-sources` : undefined,
      });

  if (orderedCandidateSourceIds.length === 0) return [];

  const normalizedTargetAmountUsd = parseNonNegativeNumber(targetAmountUsd);
  if (normalizedTargetAmountUsd <= 0) {
    const defaultSourceIds = [orderedCandidateSourceIds[0]];
    if (debugContext) {
      const sourceFiatByKeyMap = buildSourceFiatByKeyMap(swapBalance);
      const priorityRankMap = buildPriorityRankMap(swapBalance, destination);
      logDepositSourceSelection(debugContext, {
        destination,
        minimumBalanceUsd,
        targetAmountUsd: normalizedTargetAmountUsd,
        requestedSourceIds: requestedSourceIds ?? null,
        orderedCandidateSourceIds,
        orderedCandidateSources: buildSourceDebugEntries({
          sourceIds: orderedCandidateSourceIds,
          swapBalance,
          sourceFiatByKeyMap,
          priorityRankMap,
        }),
        selectedSourceIds: defaultSourceIds,
        selectedSources: buildSourceDebugEntries({
          sourceIds: defaultSourceIds,
          swapBalance,
          sourceFiatByKeyMap,
          priorityRankMap,
        }),
        runningTotalUsd: buildSourceDebugEntries({
          sourceIds: defaultSourceIds,
          swapBalance,
          sourceFiatByKeyMap,
          priorityRankMap,
        }).reduce((sum, source) => sum + source.balanceInFiat, 0),
      });
    }
    return defaultSourceIds;
  }

  const sourceFiatByKeyMap = buildSourceFiatByKeyMap(swapBalance);
  const priorityRankMap = buildPriorityRankMap(swapBalance, destination);
  const selectedSourceIds: string[] = [];
  let runningTotalUsd = 0;

  for (const sourceId of orderedCandidateSourceIds) {
    const parsed = parseSourceId(sourceId);
    if (!parsed) continue;

    selectedSourceIds.push(sourceId);
    runningTotalUsd +=
      sourceFiatByKeyMap.get(
        getFiatLookupKey(parsed.tokenAddress, parsed.chainId),
      ) ?? 0;

    if (runningTotalUsd >= normalizedTargetAmountUsd) {
      break;
    }
  }

  if (debugContext) {
    logDepositSourceSelection(debugContext, {
      destination,
      minimumBalanceUsd,
      targetAmountUsd: normalizedTargetAmountUsd,
      requestedSourceIds: requestedSourceIds ?? null,
      orderedCandidateSourceIds,
      orderedCandidateSources: buildSourceDebugEntries({
        sourceIds: orderedCandidateSourceIds,
        swapBalance,
        sourceFiatByKeyMap,
        priorityRankMap,
      }),
      selectedSourceIds,
      selectedSources: buildSourceDebugEntries({
        sourceIds: selectedSourceIds,
        swapBalance,
        sourceFiatByKeyMap,
        priorityRankMap,
      }),
      runningTotalUsd,
    });
  }

  return selectedSourceIds;
}

export function buildSortedFromSources(params: {
  sourceIds: Iterable<string>;
  swapBalance: UserAsset[] | null;
  destination: Pick<
    DestinationConfig,
    "chainId" | "tokenAddress" | "tokenSymbol"
  >;
  minimumBalanceUsd?: number;
  debugContext?: string;
}): Array<{ tokenAddress: Hex; chainId: number }> {
  const requestedSourceIds = [...new Set(params.sourceIds)];
  const orderedIds = sortSourceIdsByPriority({
    ...params,
    sourceIds: requestedSourceIds,
  });
  const orderedSources = orderedIds
    .map((sourceId) => parseSourceId(sourceId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (params.debugContext) {
    const sourceFiatByKeyMap = buildSourceFiatByKeyMap(params.swapBalance);
    const priorityRankMap = buildPriorityRankMap(
      params.swapBalance,
      params.destination,
    );
    logDepositSourceSelection(params.debugContext, {
      destination: params.destination,
      minimumBalanceUsd: params.minimumBalanceUsd ?? null,
      requestedSourceIds,
      orderedSourceIds: orderedIds,
      orderedSources: buildSourceDebugEntries({
        sourceIds: orderedIds,
        swapBalance: params.swapBalance,
        sourceFiatByKeyMap,
        priorityRankMap,
      }),
      fromSources: orderedSources,
    });
  }

  return orderedSources;
}

export function formatFeeUsd(amountUsd: number): string {
  if (amountUsd > 0 && amountUsd < 0.001) {
    return "< $0.001";
  }
  return formatUsdForDisplay(amountUsd);
}

export function formatSignedUsd(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "$0.00";
  const sign = value < 0 ? "-" : "+";
  const absolute = Math.abs(value);
  const absoluteLabel =
    absolute < 0.001 ? "< $0.001" : formatUsdForDisplay(absolute);
  return `${sign}${absoluteLabel}`;
}

export function formatImpactPercent(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0%";
  const absolute = Math.abs(value);
  if (absolute < 0.01) {
    return "< 0.01%";
  }
  const sign = value < 0 ? "-" : "+";
  const fixed = absolute.toFixed(2);
  return `${sign}${fixed.replace(/\.?0+$/, "")}%`;
}
