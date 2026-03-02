"use client";

import { useMemo } from "react";
import type { DestinationConfig, AssetSelectionState } from "../types";
import type {
  OnSwapIntentHookData,
  NexusSDK,
  UserAsset,
} from "@avail-project/nexus-core";
import { CHAIN_METADATA, formatTokenBalance } from "@avail-project/nexus-core";
import { usdFormatter } from "../../common";
import type { SwapSkippedData } from "./use-deposit-state";

const NATIVE_TOKEN_PLACEHOLDER_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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

  const nativeSymbol =
    CHAIN_METADATA[chainId as keyof typeof CHAIN_METADATA]?.nativeCurrency
      ?.symbol;
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
  swapBalance: UserAsset[] | null;
  assetSelection: AssetSelectionState;
  activeIntent: OnSwapIntentHookData | null;
  destination: DestinationConfig;
  inputAmount: string | undefined;
  exchangeRate: Record<string, number> | null;
  getFiatValue: (amount: number, symbol: string) => number;
  actualGasFeeUsd: number | null;
  swapSkippedData: SwapSkippedData | null;
  skipSwap: boolean;
  nexusSDK: NexusSDK | null;
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
  balanceInFiat?: number;
  tokenLogo?: string;
  chainLogo?: string;
  chainName?: string;
}

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
      if (!asset?.breakdown?.length) continue;
      for (const breakdown of asset.breakdown) {
        if (!breakdown?.chain?.id || !breakdown.balance) continue;
        const numericBalance = Number.parseFloat(breakdown.balance);
        if (!Number.isFinite(numericBalance) || numericBalance <= 0) continue;

        items.push({
          chainId: breakdown.chain.id,
          tokenAddress: breakdown.contractAddress as `0x${string}`,
          decimals: breakdown.decimals ?? asset.decimals,
          symbol: asset.symbol,
          balance: breakdown.balance,
          balanceInFiat: breakdown.balanceInFiat,
          tokenLogo: asset.icon,
          chainLogo: breakdown.chain.logo,
          chainName: breakdown.chain.name,
        });
      }
    }
    return items.toSorted(
      (a, b) => (b.balanceInFiat ?? 0) - (a.balanceInFiat ?? 0),
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
          return sum + (asset.balanceInFiat ?? 0);
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
      swapBalance?.reduce((acc, balance) => acc + balance.balanceInFiat, 0) ??
      0;
    return { balance, usdBalance };
  }, [swapBalance]);

  /**
   * User's existing balance on destination chain
   */
  const destinationBalance = useMemo(() => {
    if (!nexusSDK || !swapBalance || !destination) return undefined;
    return swapBalance
      ?.find((token) => token.symbol === destination.tokenSymbol)
      ?.breakdown?.find((chain) => chain.chain?.id === destination.chainId);
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
    const receiveTokenAmount = receiveAmountUsd / tokenExchangeRate;

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

    activeIntent.intent.sources.forEach((source) => {
      const sourcePricingSymbol = resolvePricingSymbol({
        chainId: source.chain.id,
        contractAddress: source.token.contractAddress,
        fallbackSymbol: source.token.symbol,
      });
      const sourceAmount = Number.parseFloat(source.amount);
      const sourceAmountUsd = Number.isFinite(sourceAmount)
        ? getFiatValue(sourceAmount, sourcePricingSymbol)
        : 0;

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
    const totalAmountSpentUsd = activeIntent.intent.sources?.reduce(
      (acc, source) => {
        const sourcePricingSymbol = resolvePricingSymbol({
          chainId: source.chain.id,
          contractAddress: source.token.contractAddress,
          fallbackSymbol: source.token.symbol,
        });
        const amount = Number.parseFloat(source.amount);
        const usdAmount = Number.isFinite(amount)
          ? getFiatValue(amount, sourcePricingSymbol)
          : 0;
        return acc + usdAmount;
      },
      0,
    );

    // Get the actual amount arriving on destination (AFTER fees)
    const destinationAmount = Number.parseFloat(
      activeIntent.intent.destination?.amount ?? "0",
    );
    const destinationPricingSymbol = resolvePricingSymbol({
      chainId:
        activeIntent.intent.destination?.chain?.id ?? destination.chainId,
      contractAddress: activeIntent.intent.destination?.token?.contractAddress,
      fallbackSymbol:
        activeIntent.intent.destination?.token?.symbol ??
        destination.tokenSymbol,
    });
    const destinationAmountUsd = getFiatValue(
      destinationAmount,
      destinationPricingSymbol,
    );

    const intentFeesAndBuffer = activeIntent.intent.feesAndBuffer;
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

    // Prefer the larger value so newly added backend fee keys are not silently undercounted.
    const bridgeFeeUsd = Math.max(bridgeFeeExplicitTotal, bridgeFeeComponentsTotal);

    // Fall back to inferred fee only when intent payload has no feesAndBuffer field.
    const inferredFeeUsd = Math.max(0, totalAmountSpentUsd - destinationAmountUsd);
    const hasIntentFeeBreakdown = Boolean(intentFeesAndBuffer);
    const totalFeeUsd = hasIntentFeeBreakdown ? bridgeFeeUsd : inferredFeeUsd;

    // Calculate destination balance used
    const usedFromDestinationUsd = Math.max(
      0,
      receiveAmountUsd - destinationAmountUsd,
    );

    if (usedFromDestinationUsd > 0.01 && destinationBalance) {
      const usedTokenAmount = usedFromDestinationUsd / tokenExchangeRate;
      const chainMeta =
        CHAIN_METADATA[destination.chainId as keyof typeof CHAIN_METADATA];

      sources.push({
        chainId: destination.chainId,
        tokenAddress: destination.tokenAddress,
        decimals: destination.tokenDecimals,
        symbol: destination.tokenSymbol,
        balance: usedTokenAmount.toString(),
        balanceInFiat: usedFromDestinationUsd,
        tokenLogo: destination.tokenLogo,
        chainLogo: chainMeta?.logo,
        chainName: chainMeta?.name,
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
      destinationChainName: activeIntent.intent.destination?.chain?.name,
    };
  }, [
    activeIntent,
    nexusSDK,
    destination,
    availableAssets,
    inputAmount,
    exchangeRate,
    getFiatValue,
    destinationBalance,
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
      gasUsd = getFiatValue(estimatedFeeEth, destination.gasTokenSymbol ?? "ETH");
    } else if (activeIntent?.intent?.destination?.gas) {
      // Otherwise use estimated gas from intent
      const gas = activeIntent.intent.destination.gas;
      const gasAmount = parseFloat(gas.amount);
      const gasSymbol = resolvePricingSymbol({
        chainId:
          activeIntent.intent.destination?.chain?.id ?? destination.chainId,
        contractAddress: gas.token?.contractAddress,
        fallbackSymbol: gas.token?.symbol ?? destination.gasTokenSymbol ?? "ETH",
      });
      gasUsd = getFiatValue(gasAmount, gasSymbol);
    }

    const bridgeRaw = activeIntent?.intent?.feesAndBuffer?.bridge;
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
    const bridgeUsd = Math.max(bridgeExplicitTotal, bridgeComponentsTotal);

    // Intent buffer can be displayed for transparency but is not added to total fee.
    const bufferUsd = parseNonNegativeNumber(
      activeIntent?.intent?.feesAndBuffer?.buffer,
    );

    const totalFeeUsd = gasUsd + bridgeUsd;
    const gasFormatted = usdFormatter.format(gasUsd);

    return {
      totalGasFee: gasUsd,
      gasUsd,
      gasFormatted,
      bridgeUsd,
      bufferUsd,
      totalFeeUsd,
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
