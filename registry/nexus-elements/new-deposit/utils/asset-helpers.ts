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
 * Auto-selected token symbols for "any token" mode
 * These are the top tokens selected by default
 */
export const AUTO_SELECTED_SYMBOLS = ["USDC", "ETH", "SOL"];

/**
 * Get chain IDs for a specific filter preset
 */
export function getChainIdsForFilter(
  filter: "all" | "stablecoins" | "native"
): Set<string> {
  const ids = new Set<string>();
  TOKENS.forEach((token) => {
    const shouldInclude =
      (filter === "all" && AUTO_SELECTED_SYMBOLS.includes(token.symbol)) ||
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
 * Sort tokens by filter preset (matching tokens first, then by USD value)
 */
export function sortTokensByFilter(tokens: Token[], filter: AssetFilterType): Token[] {
  if (filter === "custom") {
    // For custom, keep original order (sorted by value)
    return sortTokensByValue(tokens);
  }

  return [...tokens].sort((a, b) => {
    const aMatches = 
      (filter === "all" && AUTO_SELECTED_SYMBOLS.includes(a.symbol)) ||
      (filter === "stablecoins" && a.category === "stablecoin") ||
      (filter === "native" && a.symbol === "ETH");
    
    const bMatches = 
      (filter === "all" && AUTO_SELECTED_SYMBOLS.includes(b.symbol)) ||
      (filter === "stablecoins" && b.category === "stablecoin") ||
      (filter === "native" && b.symbol === "ETH");

    // If one matches and other doesn't, prioritize the matching one
    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;
    
    // If both match or both don't match, sort by USD value
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

