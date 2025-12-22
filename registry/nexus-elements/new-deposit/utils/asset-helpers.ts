import type { Token, AssetFilterType } from "../types";
import { TOKENS, ALL_TOKENS } from "../data/tokens";

/**
 * Parse USD value string to number (e.g., "$1,550" -> 1550)
 */
export function parseUsdValue(usdValue: string): number {
  return parseFloat(usdValue.replace(/[$,]/g, ""));
}

/**
 * Get all chain IDs from main tokens
 */
export function getAllChainIds(): Set<string> {
  const ids = new Set<string>();
  TOKENS.forEach((token) => {
    token.chains.forEach((chain) => ids.add(chain.id));
  });
  return ids;
}

/**
 * Get chain IDs for a specific filter preset
 */
export function getChainIdsForFilter(
  filter: "all" | "stablecoins" | "native"
): Set<string> {
  const ids = new Set<string>();
  TOKENS.forEach((token) => {
    const shouldInclude =
      filter === "all" ||
      (filter === "stablecoins" && token.category === "stablecoin") ||
      (filter === "native" && token.symbol === "ETH");

    if (shouldInclude) {
      token.chains.forEach((chain) => ids.add(chain.id));
    }
  });
  return ids;
}

/**
 * Check if current selection matches a preset filter
 */
export function checkIfMatchesPreset(
  selectedChainIds: Set<string>
): AssetFilterType {
  const allIds = getChainIdsForFilter("all");
  const stableIds = getChainIdsForFilter("stablecoins");
  const nativeIds = getChainIdsForFilter("native");

  const setsEqual = (a: Set<string>, b: Set<string>) =>
    a.size === b.size && [...a].every((id) => b.has(id));

  if (setsEqual(selectedChainIds, allIds)) return "all";
  if (setsEqual(selectedChainIds, stableIds)) return "stablecoins";
  if (setsEqual(selectedChainIds, nativeIds)) return "native";
  return "custom";
}

/**
 * Calculate total USD value for selected chain IDs
 */
export function calculateSelectedAmount(selectedChainIds: Set<string>): number {
  let total = 0;
  ALL_TOKENS.forEach((token) => {
    token.chains.forEach((chain) => {
      if (selectedChainIds.has(chain.id)) {
        total += parseUsdValue(chain.usdValue);
      }
    });
  });
  return total;
}

/**
 * Sort tokens by USD value (highest first)
 */
export function sortTokensByValue(tokens: Token[]): Token[] {
  return [...tokens].sort((a, b) => {
    return parseUsdValue(b.usdValue) - parseUsdValue(a.usdValue);
  });
}

/**
 * Get checkbox state for a token based on selected chains
 */
export function getTokenCheckState(
  token: Token,
  selectedChainIds: Set<string>
): boolean | "indeterminate" {
  const selectedChainCount = token.chains.filter((c) =>
    selectedChainIds.has(c.id)
  ).length;

  if (selectedChainCount === 0) return false;
  if (selectedChainCount === token.chains.length) return true;
  return "indeterminate";
}

/**
 * Find a token by ID from all tokens
 */
export function findTokenById(tokenId: string): Token | undefined {
  return ALL_TOKENS.find((t) => t.id === tokenId);
}

