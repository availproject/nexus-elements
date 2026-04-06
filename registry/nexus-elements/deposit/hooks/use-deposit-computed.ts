"use client";

import { useMemo } from "react";
import type { DestinationConfig, AssetSelectionState } from "../types";
import type { createNexusClient } from "@avail-project/nexus-sdk-v2";
import type {
  SwapAndExecuteOnIntentHookData,
  TokenBalance,
  ChainBalance,
} from "@avail-project/nexus-sdk-v2";
import { formatTokenBalance } from "@avail-project/nexus-sdk-v2/utils";
import { usdFormatter } from "../../common";
import type { SwapSkippedData } from "./use-deposit-state";

type NexusClient = ReturnType<typeof createNexusClient>;

const NATIVE_TOKEN_PLACEHOLDER_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// v2: CHAIN_METADATA not exported — hardcode well-known native symbols per chain
const NATIVE_SYMBOL_BY_CHAIN: Record<number, string> = {
  1: "ETH",       // Ethereum
  8453: "ETH",    // Base
  42161: "ETH",   // Arbitrum
  10: "ETH",      // Optimism
  137: "MATIC",   // Polygon
  43114: "AVAX",  // Avalanche
  534352: "ETH",  // Scroll
  56: "BNB",      // BNB
  8217: "KAIA",   // Kaia
  6342: "ETH",    // MegaETH
  10143: "MON",   // Monad
  999: "HYPE",    // HyperEVM
  5115: "cBTC",   // Citrea
  11155111: "ETH", // Sepolia
  84532: "ETH",   // Base Sepolia
  421614: "ETH",  // Arbitrum Sepolia
  11155420: "ETH", // Optimism Sepolia
  80002: "MATIC", // Polygon Amoy
};

function normalizeAddress(address?: string | null): string {
  return (address ?? "").toLowerCase();
}

function isNativeLikeAddress(address?: string | null): boolean {
  const normalized = normalizeAddress(address);
  return (
    normalized === NATIVE_TOKEN_PLACEHOLDER_ADDRESS ||
    normalized === ZERO_ADDRESS
  );
}

function resolvePricingSymbol(params: {
  chainId: number;
  contractAddress?: string | null;
  fallbackSymbol: string;
}): string {
  const { chainId, contractAddress, fallbackSymbol } = params;
  if (!isNativeLikeAddress(contractAddress)) {
    return fallbackSymbol;
  }

  const nativeSymbol = NATIVE_SYMBOL_BY_CHAIN[chainId];
  return nativeSymbol ?? fallbackSymbol;
}

function parseNonNegativeNumber(value: unknown): number {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function formatFeeKeyLabel(key: string): string {
  const normalized = key.trim();
  if (!normalized) return "Fee";

  const knownLabels: Record<string, string> = {
    caGas: "CA gas",
    protocol: "Protocol",
    solver: "Solver",
    collection: "Collection",
    fulfilment: "Fulfilment",
    gasSupplied: "Gas supplied",
  };

  if (knownLabels[normalized]) {
    return knownLabels[normalized];
  }

  const spaced = normalized
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface UseDepositComputedProps {
  swapBalance: TokenBalance[] | null;
  assetSelection: AssetSelectionState;
  activeIntent: SwapAndExecuteOnIntentHookData | null;
  destination: DestinationConfig;
  inputAmount: string | undefined;
  exchangeRate: Record<string, number> | null;
  getFiatValue: (amount: number, symbol: string) => number;
  actualGasFeeUsd: number | null;
  swapSkippedData: SwapSkippedData | null;
  skipSwap: boolean;
  nexusSDK: NexusClient | null;
}

/**
 * v2: SwapAndExecuteIntent wraps the inner SwapIntent under .swap when swapRequired=true.
 * This helper extracts compatible properties for display.
 */
type SwapIntentLike = {
  sources?: { chain: { id: number; name: string; logo: string }; token: { contractAddress: string; symbol: string; decimals: number }; amount: string; value?: string }[];
  destination?: { chain?: { id?: number; name?: string }; value?: string; gas?: { value?: string } };
  feesAndBuffer?: { bridge?: Record<string, string | undefined> & { total?: string; caGas?: string; protocol?: string; solver?: string }; buffer?: string };
};

function getSwapIntentLike(
  intent: SwapAndExecuteOnIntentHookData["intent"] | undefined | null,
): SwapIntentLike | null {
  if (!intent) return null;
  if (intent.swapRequired) {
    // v2: inner SwapIntent is at intent.swap
    const inner = (intent as { swapRequired: true; swap: unknown }).swap;
    return inner as SwapIntentLike;
  }
  // swapRequired=false: no swap data available
  return null;
}

/**
 * Available asset item from swap balance
 */
export interface AvailableAsset {
  chainId: number;
  tokenAddress: `0x${string}`;
  decimals: number;
  symbol: string;
  balance: string;
  value?: string;          // v2: USD value as string (from ChainBalance.value)
  balanceInFiat?: number;  // kept for legacy callers
  tokenLogo?: string;
  chainLogo?: string;
  chainName?: string;
}

type AssetBreakdownWithOptionalIcon = ChainBalance & {
  icon?: string;
};

/**
 * Hook for computing derived values from deposit widget state.
 * Separates computation logic from main hook for better maintainability.
 */
export function useDepositComputed(props: UseDepositComputedProps) {
  const {
    swapBalance,
    assetSelection,
    activeIntent,
    destination,
    inputAmount,
    exchangeRate,
    getFiatValue,
    actualGasFeeUsd,
    swapSkippedData,
    skipSwap,
    nexusSDK,
  } = props;

  /**
   * Flatten swap balance into a sorted list of available assets
   */
  const availableAssets = useMemo<AvailableAsset[]>(() => {
    if (!swapBalance) return [];
    const items: AvailableAsset[] = [];

    for (const asset of swapBalance) {
      if (!asset?.chainBalances?.length) continue;
      for (const breakdown of asset.chainBalances) {
        if (!breakdown?.chain?.id || !breakdown.balance) continue;
        const numericBalance = Number.parseFloat(breakdown.balance);
        if (!Number.isFinite(numericBalance) || numericBalance <= 0) continue;
        const breakdownIcon = (breakdown as AssetBreakdownWithOptionalIcon)
          .icon;

        items.push({
          chainId: breakdown.chain.id,
          tokenAddress: breakdown.contractAddress as `0x${string}`,
          decimals: breakdown.decimals ?? asset.decimals,
          // v2: breakdown has no .symbol — use parent asset.symbol
          symbol: asset.symbol,
          balance: breakdown.balance,
          value: breakdown.value,
          tokenLogo: breakdownIcon || "",
          chainLogo: breakdown.chain.logo,
          chainName: breakdown.chain.name,
        });
      }
    }
    return items.toSorted((a: AvailableAsset, b: AvailableAsset) => (parseFloat(b.value ?? "0") ?? 0) - (parseFloat(a.value ?? "0") ?? 0),
    );
  }, [swapBalance]);

  /**
   * Total USD value of selected assets
   */
  const totalSelectedBalance = useMemo(
    () =>
      availableAssets.reduce((sum, asset) => {
        const key = `${asset.tokenAddress}-${asset.chainId}`;
        if (assetSelection.selectedChainIds.has(key)) {
          return sum + (parseFloat(asset.value ?? "0") ?? 0);
        }
        return sum;
      }, 0),
    [availableAssets, assetSelection.selectedChainIds],
  );

  /**
   * Total balance across all assets
   */
  const totalBalance = useMemo(() => {
    const balance =
      swapBalance?.reduce(
        (acc, balance) => acc + parseFloat(balance.balance),
        0,
      ) ?? 0;
    const usdBalance =
      swapBalance?.reduce((acc, balance) => acc + parseFloat(balance.value ?? "0"), 0) ??
      0;
    return { balance, usdBalance };
  }, [swapBalance]);

  /**
   * User's existing balance on destination chain
   */
  const destinationBalance = useMemo(() => {
    if (!nexusSDK || !swapBalance || !destination) return undefined;
    return swapBalance
      ?.flatMap((token) => token.chainBalances ?? [])
      ?.find(
        (chain) =>
          chain.chain?.id === destination.chainId &&
          normalizeAddress(chain.contractAddress) ===
          normalizeAddress(destination.tokenAddress),
      );
  }, [swapBalance, nexusSDK, destination]);

  /**
   * Confirmation screen details computed from intent or skipped swap data
   */
  const confirmationDetails = useMemo(() => {
    // Handle swap skipped case - compute from swapSkippedData
    if (swapSkippedData && skipSwap) {
      const { destination: destData, gas } = swapSkippedData;

      // Format the token amount from raw units
      const rawAmount = Number.parseFloat(destData.amount);
      const tokenAmount = rawAmount / Math.pow(10, destData.token.decimals);
      const receiveAmountUsd = getFiatValue(tokenAmount, destData.token.symbol);

      // Format for display
      const receiveAmountAfterSwap = `${tokenAmount.toFixed(2)} ${destData.token.symbol}`;

      // Gas fee calculation from swapSkippedData
      const estimatedFeeWei = Number.parseFloat(gas.estimatedFee);
      const estimatedFeeEth = estimatedFeeWei / 1e18;
      const gasFeeUsd = getFiatValue(
        estimatedFeeEth,
        destination.gasTokenSymbol ?? "ETH",
      );

      return {
        sourceLabel: destination.label ?? "Deposit",
        sources: [],
        gasTokenSymbol: destination.gasTokenSymbol,
        estimatedTime: destination.estimatedTime ?? "~30s",
        amountSpent: receiveAmountUsd,
        totalFeeUsd: gasFeeUsd,
        receiveTokenSymbol: destData.token.symbol,
        receiveAmountAfterSwapUsd: receiveAmountUsd,
        receiveAmountAfterSwap,
        receiveTokenLogo: destination.tokenLogo,
        receiveTokenChain: destData.chain.id,
        destinationChainName: destData.chain.name,
      };
    }

    if (!activeIntent || !nexusSDK) return null;

    // Use user's requested amount (from input), not SDK's optimized bridge amount
    const receiveAmountUsd = inputAmount
      ? parseFloat(inputAmount.replace(/,/g, ""))
      : 0;

    // Convert USD amount to token amount for display
    const tokenExchangeRate = exchangeRate?.[destination.tokenSymbol] ?? 1;
    const safeTokenExchangeRate =
      Number.isFinite(tokenExchangeRate) && tokenExchangeRate > 0
        ? tokenExchangeRate
        : 1;
    const receiveTokenAmount = receiveAmountUsd / safeTokenExchangeRate;

    const receiveAmountAfterSwap = formatTokenBalance(
      receiveTokenAmount.toString(),
      {
        symbol: destination.tokenSymbol,
        decimals: destination.tokenDecimals,
      },
    );

    // Build sources array from intent sources
    const sources: Array<{
      chainId: number;
      tokenAddress: `0x${string}`;
      decimals: number;
      symbol: string;
      balance: string;
      balanceInFiat?: number;
      tokenLogo?: string;
      chainLogo?: string;
      chainName?: string;
      isDestinationBalance?: boolean;
    }> = [];

    // v2: extract inner SwapIntent from SwapAndExecuteIntent
    const swapIntent = getSwapIntentLike(activeIntent.intent);

    swapIntent?.sources?.forEach((source) => {
      const sourcePricingSymbol = resolvePricingSymbol({
        chainId: source.chain.id,
        contractAddress: source.token.contractAddress,
        fallbackSymbol: source.token.symbol,
      });
      const sourceAmountUsd = parseNonNegativeNumber(source.value);

      const matchingAsset = availableAssets.find(
        (asset) =>
          asset.chainId === source.chain.id &&
          (normalizeAddress(asset.tokenAddress) ===
            normalizeAddress(source.token.contractAddress) ||
            asset.symbol.toUpperCase() === source.token.symbol.toUpperCase()),
      );

      if (matchingAsset) {
        sources.push({
          ...matchingAsset,
          symbol: sourcePricingSymbol,
          balance: source.amount,
          balanceInFiat: sourceAmountUsd,
          isDestinationBalance: false,
        });
      } else {
        sources.push({
          chainId: source.chain.id,
          tokenAddress: source.token.contractAddress as `0x${string}`,
          decimals: source.token.decimals,
          symbol: sourcePricingSymbol,
          balance: source.amount,
          balanceInFiat: sourceAmountUsd,
          chainLogo: source.chain.logo,
          chainName: source.chain.name,
          isDestinationBalance: false,
        });
      }
    });

    // Calculate total spent from cross-chain sources
    const totalAmountSpentUsd = swapIntent?.sources?.reduce(
      (acc: number, source: { value?: string }) => acc + parseNonNegativeNumber(source.value),
      0,
    ) ?? 0;

    // Get the actual amount arriving on destination (AFTER fees)
    const destinationAmountUsd = parseNonNegativeNumber(
      swapIntent?.destination?.value,
    );

    const intentFeesAndBuffer = swapIntent?.feesAndBuffer;
    const bridgeFeeEntries = Object.entries(intentFeesAndBuffer?.bridge ?? {})
      .filter(([key]) => key !== "total")
      .map(([key, value]) => ({
        key,
        amountUsd: parseNonNegativeNumber(value),
      }));
    const bridgeFeeComponentsTotal = bridgeFeeEntries.reduce(
      (sum, fee) => sum + fee.amountUsd,
      0,
    );
    const bridgeFeeExplicitTotal = parseNonNegativeNumber(
      intentFeesAndBuffer?.bridge?.total,
    );

    // SDK-provided bridge total is authoritative; component sum is a fallback.
    const bridgeFeeUsd =
      bridgeFeeExplicitTotal > 0
        ? bridgeFeeExplicitTotal
        : bridgeFeeComponentsTotal;

    // Fall back to inferred fee only when intent payload has no feesAndBuffer field.
    const inferredFeeUsd = Math.max(
      0,
      totalAmountSpentUsd - destinationAmountUsd,
    );
    const hasIntentFeeBreakdown = Boolean(intentFeesAndBuffer);
    const totalFeeUsd = hasIntentFeeBreakdown ? bridgeFeeUsd : inferredFeeUsd;

    // Calculate destination balance used
    const usedFromDestinationUsd = Math.max(
      0,
      receiveAmountUsd - destinationAmountUsd,
    );

    if (usedFromDestinationUsd > 0) {
      const usedTokenAmount = usedFromDestinationUsd / safeTokenExchangeRate;
      // v2: no CHAIN_METADATA — chainLogo and chainName are not available here

      sources.push({
        chainId: destination.chainId,
        tokenAddress: destination.tokenAddress,
        decimals: destination.tokenDecimals,
        symbol: destination.tokenSymbol,
        balance: usedTokenAmount.toString(),
        balanceInFiat: usedFromDestinationUsd,
        tokenLogo: destination.tokenLogo,
        chainLogo: undefined,
        chainName: undefined,
        isDestinationBalance: true,
      });
    }

    const actualAmountSpent = totalAmountSpentUsd + usedFromDestinationUsd;

    return {
      sourceLabel: destination.label ?? "Deposit",
      sources,
      gasTokenSymbol: destination.gasTokenSymbol,
      estimatedTime: destination.estimatedTime ?? "~30s",
      amountSpent: actualAmountSpent,
      totalFeeUsd,
      receiveTokenSymbol: destination.tokenSymbol,
      receiveAmountAfterSwapUsd: receiveAmountUsd,
      receiveAmountAfterSwap,
      receiveTokenLogo: destination.tokenLogo,
      receiveTokenChain: destination.chainId,
      destinationChainName: swapIntent?.destination?.chain?.name,
    };
  }, [
    activeIntent,
    nexusSDK,
    destination,
    availableAssets,
    inputAmount,
    exchangeRate,
    getFiatValue,
    swapSkippedData,
    skipSwap,
  ]);

  /**
   * Gas fee breakdown for display
   */
  const feeBreakdown = useMemo(() => {
    let gasUsd = 0;

    // Use actual gas fee from receipt if available
    if (actualGasFeeUsd !== null) {
      gasUsd = actualGasFeeUsd;
    } else if (swapSkippedData && skipSwap) {
      // Use gas from swapSkippedData when swap is skipped
      const { gas } = swapSkippedData;
      const estimatedFeeWei = Number.parseFloat(gas.estimatedFee);
      const estimatedFeeEth = estimatedFeeWei / 1e18;
      gasUsd = getFiatValue(
        estimatedFeeEth,
        destination.gasTokenSymbol ?? "ETH",
      );
    } else if (activeIntent?.intent) {
      // v2: extract inner SwapIntent for gas info
      const swapIntentLike = getSwapIntentLike(activeIntent.intent);
      if (swapIntentLike?.destination?.gas) {
        // Otherwise use estimated gas from intent
        const gas = swapIntentLike.destination.gas;
        gasUsd = parseNonNegativeNumber(gas.value);
      }
    }

    const bridgeRaw = (() => {
      if (!activeIntent?.intent) return undefined;
      const swapIntentLike = getSwapIntentLike(activeIntent.intent);
      return swapIntentLike?.feesAndBuffer?.bridge;
    })();
    const caGasUsd = parseNonNegativeNumber(bridgeRaw?.caGas);
    const gasSuppliedUsd = parseNonNegativeNumber(
      (bridgeRaw as Record<string, string | undefined> | undefined)
        ?.gasSupplied,
    );
    const protocolFeeUsd = parseNonNegativeNumber(bridgeRaw?.protocol);
    const solverFeeUsd = parseNonNegativeNumber(bridgeRaw?.solver);

    const hasBridgeBreakdown = Boolean(bridgeRaw);
    const executionBridgeUsd = caGasUsd;
    const gasSponsorshipUsd = hasBridgeBreakdown ? gasSuppliedUsd : 0;
    const executionGasFeeUsd = hasBridgeBreakdown ? executionBridgeUsd : gasUsd;

    const bridgeComponents = Object.entries(bridgeRaw ?? {})
      .filter(([key]) => key !== "total")
      .map(([key, value]) => ({
        key,
        label: formatFeeKeyLabel(key),
        amountUsd: parseNonNegativeNumber(value),
      }))
      .filter((component) => component.amountUsd > 0);

    const bridgeComponentsTotal = bridgeComponents.reduce(
      (sum, component) => sum + component.amountUsd,
      0,
    );
    const bridgeExplicitTotal = parseNonNegativeNumber(bridgeRaw?.total);
    const bridgeUsd =
      bridgeExplicitTotal > 0 ? bridgeExplicitTotal : bridgeComponentsTotal;
    const knownBridgeRowsUsd =
      gasSponsorshipUsd + executionGasFeeUsd + protocolFeeUsd + solverFeeUsd;
    const otherBridgeFeeUsd = Math.max(0, bridgeUsd - knownBridgeRowsUsd);

    // Intent buffer can be displayed for transparency but is not added to total fee.
    const bufferUsd = parseNonNegativeNumber(
      (() => {
        if (!activeIntent?.intent) return undefined;
        const swapIntentLike2 = getSwapIntentLike(activeIntent.intent);
        return swapIntentLike2?.feesAndBuffer?.buffer;
      })(),
    );

    const totalFeeUsd =
      executionGasFeeUsd +
      gasSponsorshipUsd +
      protocolFeeUsd +
      solverFeeUsd +
      otherBridgeFeeUsd;
    const gasFormatted = usdFormatter.format(gasUsd);

    const sourceValueUsd = (() => {
      if (!activeIntent?.intent) return 0;
      const swapIntentLike3 = getSwapIntentLike(activeIntent.intent);
      return (swapIntentLike3?.sources ?? []).reduce(
        (sum: number, source: { value?: string }) => sum + parseNonNegativeNumber(source.value),
        0,
      );
    })();

    const destinationValueUsd = (() => {
      if (!activeIntent?.intent) return 0;
      const swapIntentLike4 = getSwapIntentLike(activeIntent.intent);
      return parseNonNegativeNumber(swapIntentLike4?.destination?.value);
    })();

    const totalSomething = destinationValueUsd + totalFeeUsd + bufferUsd;
    const swapImpactUsd = totalSomething - sourceValueUsd;
    const spendBaseUsd = sourceValueUsd - totalFeeUsd - bufferUsd;
    const swapImpactPercent =
      spendBaseUsd > 0 ? (swapImpactUsd / spendBaseUsd) * 100 : 0;

    return {
      totalGasFee: gasUsd,
      gasUsd,
      gasFormatted,
      bridgeUsd,
      bufferUsd,
      totalFeeUsd,
      gasSponsorshipUsd,
      executionGasFeeUsd,
      protocolFeeUsd,
      solverFeeUsd,
      otherBridgeFeeUsd,
      swapImpactUsd,
      swapImpactPercent,
      bridgeComponents,
    };
  }, [
    activeIntent,
    getFiatValue,
    actualGasFeeUsd,
    swapSkippedData,
    skipSwap,
    destination.chainId,
    destination.gasTokenSymbol,
    destination.tokenSymbol,
  ]);

  return {
    availableAssets,
    totalSelectedBalance,
    totalBalance,
    destinationBalance,
    confirmationDetails,
    feeBreakdown,
  };
}
