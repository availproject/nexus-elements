"use client";

import {
  sortSourcesByPriority,
  type UserAsset,
} from "@avail-project/nexus-core";
import { padHex, type Hex } from "viem";
import type { DestinationConfig } from "../types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EVM_NATIVE_PLACEHOLDER = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const MAX_PRIORITY_RANK = Number.MAX_SAFE_INTEGER;

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

function getFiatLookupKey(tokenAddress: string, chainId: number): string {
  return `${normalizeAddress(tokenAddress)}-${chainId}`;
}

function getPriorityLookupKey(tokenAddress: string, chainId: number): string {
  return `${toComparableSdkAddress(tokenAddress)}-${chainId}`;
}

function parseNonNegativeNumber(value: unknown): number {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

interface SourceCandidate {
  sourceId: string;
  balanceInFiat: number;
  priorityRank: number;
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

function buildPriorityRankMap(
  swapBalance: UserAsset[] | null,
  destination: Pick<DestinationConfig, "chainId" | "tokenAddress" | "tokenSymbol">,
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
  destination: Pick<DestinationConfig, "chainId" | "tokenAddress" | "tokenSymbol">;
  minimumBalanceUsd?: number;
}): string[] {
  return buildSortedSourceCandidates(params).map((item) => item.sourceId);
}

function buildSortedSourceCandidates(params: {
  sourceIds: Iterable<string>;
  swapBalance: UserAsset[] | null;
  destination: Pick<DestinationConfig, "chainId" | "tokenAddress" | "tokenSymbol">;
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
      const priorityKey = getPriorityLookupKey(parsed.tokenAddress, parsed.chainId);
      const balanceInFiat = sourceFiatByKeyMap.get(fiatKey) ?? 0;
      const priorityRank = priorityRankMap.get(priorityKey) ?? MAX_PRIORITY_RANK;

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

export function buildSelectableSourceIds(params: {
  swapBalance: UserAsset[] | null;
  destination: Pick<DestinationConfig, "chainId" | "tokenAddress" | "tokenSymbol">;
  minimumBalanceUsd: number;
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
  destination: Pick<DestinationConfig, "chainId" | "tokenAddress" | "tokenSymbol">;
  minimumBalanceUsd: number;
  targetAmountUsd?: number;
  sourceIds?: Iterable<string>;
}): string[] {
  const {
    swapBalance,
    destination,
    minimumBalanceUsd,
    targetAmountUsd,
    sourceIds,
  } = params;

  const orderedCandidateSourceIds = sourceIds
    ? sortSourceIdsByPriority({
        sourceIds,
        swapBalance,
        destination,
        minimumBalanceUsd,
      })
    : buildSelectableSourceIds({
        swapBalance,
        destination,
        minimumBalanceUsd,
      });

  if (orderedCandidateSourceIds.length === 0) return [];

  const normalizedTargetAmountUsd = parseNonNegativeNumber(targetAmountUsd);
  if (normalizedTargetAmountUsd <= 0) {
    return [orderedCandidateSourceIds[0]];
  }

  const sourceFiatByKeyMap = buildSourceFiatByKeyMap(swapBalance);
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

  return selectedSourceIds;
}

export function buildSortedFromSources(params: {
  sourceIds: Iterable<string>;
  swapBalance: UserAsset[] | null;
  destination: Pick<DestinationConfig, "chainId" | "tokenAddress" | "tokenSymbol">;
  minimumBalanceUsd?: number;
}): Array<{ tokenAddress: Hex; chainId: number }> {
  const orderedIds = sortSourceIdsByPriority(params);

  return orderedIds
    .map((sourceId) => parseSourceId(sourceId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}
