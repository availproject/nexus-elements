"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  type NexusOneProps,
  type NexusOneMode,
  type SwapType,
  type DepositOpportunity,
} from "./types";
import { AmountInputUnified } from "./components/amount-input-unified";
import { PayUsingSelector } from "./components/pay-using-selector";
import { RecipientInput } from "./components/recipient-input";
import { StatusAlert } from "./components/status-alerts";
import {
  SwapAssetSelector,
  type SwapTokenOption,
} from "./components/swap-asset-selector";
import {
  SwapIntentPreview,
  type SwapIntentData,
} from "./components/swap-intent-preview";
import { ReceiveAssetSelector } from "./components/receive-asset-selector";
import { OpportunityList } from "./components/opportunity-list";
import {
  ChevronDown,
  X,
  ArrowLeft,
  PlusCircleIcon,
  PlusIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { useNexus } from "../nexus/NexusProvider";
import CardBG from "./card-bg.png";
import { useTransactionSteps } from "../common/tx/useTransactionSteps";
import { SWAP_EXPECTED_STEPS } from "../common/tx/steps";
import TransactionProgress from "../swaps/components/transaction-progress";
import { NEXUS_EVENTS, type SwapStepType } from "@avail-project/nexus-core";

// ---------------------------------------------------------------------------
// Types for swap step machine
// ---------------------------------------------------------------------------

type SwapStep =
  | "idle" // main screen
  | "choose-swap-asset" // pick source token (exactIn) or dest token (exactOut)
  | "choose-receive-asset" // pick receive token (exactIn only)
  | "preview-intent" // intent preview card
  | "progress"; // transaction in flight

// ---------------------------------------------------------------------------
// NexusOne
// ---------------------------------------------------------------------------

export function NexusOne({
  config,
  connectedAddress,
  onComplete,
  onStart,
  onError,
}: NexusOneProps) {
  const {
    nexusSDK,
    bridgableBalance,
    swapBalance,
    getFiatValue,
    resolveTokenUsdRate,
    swapSupportedChainsAndTokens,
    supportedChainsAndTokens,
  } = useNexus();

  // Mode tab
  const initialMode = Array.isArray(config.mode) ? config.mode[0] : config.mode;
  const [activeMode, setActiveMode] = useState<NexusOneMode>(initialMode);

  // Global form state
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [txError, setTxError] = useState<string | null>(null);

  // Swap-specific
  const [swapType, setSwapType] = useState<SwapType>("exactIn");
  const [swapTypeOpen, setSwapTypeOpen] = useState(false);
  const [swapStep, setSwapStep] = useState<SwapStep>("idle");
  const [fromTokens, setFromTokens] = useState<SwapTokenOption[]>([]);
  const [toToken, setToToken] = useState<SwapTokenOption | undefined>(
    undefined,
  );

  const {
    steps,
    seed,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<SwapStepType>();
  const [explorerUrls, setExplorerUrls] = useState<{
    sourceExplorerUrl: string | null;
    destinationExplorerUrl: string | null;
  }>({ sourceExplorerUrl: null, destinationExplorerUrl: null });
  const swapRunIdRef = useRef(0);
  const [intentToAmount, setIntentToAmount] = useState<string | undefined>(
    undefined,
  );
  const [intentFeeUsd, setIntentFeeUsd] = useState<string | undefined>(
    undefined,
  );
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentData, setIntentData] = useState<SwapIntentData | null>(null);

  // Ref to store swap intent hook allow/deny callbacks
  const swapIntentRef = useRef<{
    allow: () => void;
    deny: () => void;
    refresh: () => Promise<any>;
  } | null>(null);

  // Register swap intent hook immediately before executing a swap to prevent race conditions across multiple components
  const registerIntentHook = () => {
    if (!nexusSDK) return;
    nexusSDK.setOnSwapIntentHook(async ({ intent, allow, deny, refresh }) => {
      // Store callbacks so accept/reject buttons can call them
      swapIntentRef.current = { allow, deny, refresh };
      // Populate intent data for preview
      setIntentData(intent);
      console.log("on hook intent swap intent", intent, "swap intent");
      // SDK returns amount as human-readable strings (e.g. "0.91") and value as USD fiat string
      setIntentToAmount(intent.destination?.amount || undefined);

      try {
        // [Regenerated] Computed fee natively using FIAT string parsing
        const totalInUsd = intent.sources.reduce(
          (sum: number, s: any) => sum + Number(s.value || s.amount || 0),
          0,
        );
        const totalOutUsd = Number(
          intent.destination?.value || intent.destination?.amount || 0,
        );

        const fee = totalInUsd - totalOutUsd;
        setIntentFeeUsd(fee > 0 ? fee.toFixed(2) : "0.00");
      } catch (err) {
        console.warn("Could not calculate proper feeUsd", err);
        setIntentFeeUsd("0.00");
      }
      
      console.log("[DEBUG] Successfully parsed intent data! Removing loader.");
      setIntentLoading(false);
    });
  };

  useEffect(() => {
    console.log("SWAP INTENT");
    console.log("intentData", intentData);
    console.log("intentFeeUsd", intentFeeUsd);
    console.log("intentLoading", intentLoading);
    console.log("intentToAmount", intentToAmount);
  }, [intentData, intentFeeUsd, intentLoading, intentToAmount]);

  // Deposit-specific
  const [selectedOpportunity, setSelectedOpportunity] = useState<
    DepositOpportunity | undefined
  >(undefined);

  // Balance helpers
  const activeBalanceArray = swapBalance;
  const selectedToken = config.prefill?.token ?? "USDC";
  const currentAsset =
    activeBalanceArray?.find((a) => a.symbol === selectedToken) ||
    activeBalanceArray?.[0];
  const maxBalance = currentAsset?.balance
    ? String(currentAsset.balance)
    : undefined;
  const usdValue = getFiatValue(
    Number(amount) || 0,
    currentAsset?.symbol || "USDC",
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleModeChange = (mode: NexusOneMode) => {
    setActiveMode(mode);
    setAmount("");
    setTxError(null);
    setSwapStep("idle");
    setFromTokens([]);
    setToToken(undefined);
    setSelectedOpportunity(undefined);
  };

  /** Called when user hits the main CTA button */
  const handleContinue = async () => {
    onStart?.();
    if (!nexusSDK || !currentAsset || !amount || Number(amount) <= 0) return;

    try {
      const amountBigInt = nexusSDK.utils.parseUnits(
        amount,
        currentAsset.decimals || 18,
      );
      const assetDetail = currentAsset.breakdown?.[0];
      if (!assetDetail?.chain?.id || !assetDetail?.contractAddress) {
        throw new Error("No chain/token address found for selected asset.");
      }

      if (activeMode === "deposit") {
        await nexusSDK.swapAndExecute({
          toChainId: assetDetail.chain.id,
          toTokenAddress: assetDetail.contractAddress,
          toAmount: amountBigInt,
          fromSources: [
            {
              chainId: assetDetail.chain.id,
              tokenAddress: assetDetail.contractAddress,
            },
          ],
          execute: {
            to: "0x0000000000000000000000000000000000000000",
            data: "0x",
            gas: BigInt(200000),
          },
        });
      } else if (activeMode === "transfer") {
        if (!recipientAddress) throw new Error("Recipient address is required");
        await nexusSDK.swapAndExecute({
          toChainId: assetDetail.chain.id,
          toTokenAddress: assetDetail.contractAddress,
          toAmount: amountBigInt,
          fromSources: [
            {
              chainId: assetDetail.chain.id,
              tokenAddress: assetDetail.contractAddress,
            },
          ],
          execute: {
            to: recipientAddress as `0x${string}`,
            value: amountBigInt,
            gas: BigInt(21000),
          },
        });
      }
      onComplete?.();
    } catch (err: any) {
      setTxError(err?.message || "Transaction failed");
      onError?.(err?.message || "Transaction failed");
    }
  };

  /** Start swap flow — SDK will trigger setOnSwapIntentHook for preview */
  const handleEnterPreview = async () => {
    console.log("[DEBUG] handleEnterPreview called!", {
      swapType,
      amount,
      toToken,
      fromTokens,
    });
    if (!toToken || !amount) {
      console.log("[DEBUG] Aborted: missing toToken or amount");
      return;
    }
    if (swapType === "exactIn" && fromTokens.length === 0) {
      console.log("[DEBUG] Aborted: exactIn but no fromTokens");
      return;
    }

    console.log("[DEBUG] Proceeding to set preview-intent state...");
    setSwapStep("preview-intent");
    setIntentLoading(true);
    setIntentToAmount(undefined);
    setIntentFeeUsd(undefined);
    setIntentData(null);
    swapIntentRef.current = null;

    if (!nexusSDK) {
      setTxError("SDK not initialized");
      setSwapStep("idle");
      setIntentLoading(false);
      return;
    }

    console.log("Entering preview...", {
      swapType,
      toToken,
      amount,
      fromTokens,
    });
    
    // Claim ownership of global singleton hook before executing SDK swap
    registerIntentHook();
    
    const handleSwapEvent = (event: { name: string; args: SwapStepType }) => {
      if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
        const step = event.args;
        if (step?.type === "SOURCE_SWAP_HASH" && step.explorerURL) {
          setExplorerUrls((prev) => ({ ...prev, sourceExplorerUrl: step.explorerURL }));
        }
        if (step?.type === "DESTINATION_SWAP_HASH" && step.explorerURL) {
          setExplorerUrls((prev) => ({ ...prev, destinationExplorerUrl: step.explorerURL }));
        }
        onStepComplete(step);
      }
    };

    try {
      if (swapType === "exactIn") {
        let remainingDesiredUsd = Number(amount);
        const fromPayload: {
          chainId: number;
          tokenAddress: `0x${string}`;
          amount: bigint;
        }[] = [];

        const totalUsdStr = fromTokens
          .reduce((acc, curr) => acc + Number(curr.balanceInFiat || 0), 0)
          .toFixed(2);
        const isMax = Number(amount).toFixed(2) === totalUsdStr;

        for (const token of fromTokens) {
          if (isMax) {
            fromPayload.push({
              chainId: token.chainId!,
              tokenAddress: token.contractAddress as `0x${string}`,
              amount: nexusSDK.utils.parseUnits(
                String(token.balance),
                token.decimals || 18,
              ),
            });
            continue;
          }

          if (remainingDesiredUsd <= 0.0001) break;

          const balanceUsd = Number(token.balanceInFiat) || 0;
          if (balanceUsd <= 0) continue;

          const takeUsd = Math.min(remainingDesiredUsd, balanceUsd);
          const ratioToTake = takeUsd / balanceUsd;

          const exactTokenAmountToTake = Number(token.balance) * ratioToTake;
          const safeTokenAmountStr = exactTokenAmountToTake.toFixed(
            Math.min(token.decimals || 18, 18),
          );

          fromPayload.push({
            chainId: token.chainId!,
            tokenAddress: token.contractAddress as `0x${string}`,
            amount: nexusSDK.utils.parseUnits(
              safeTokenAmountStr,
              token.decimals || 18,
            ),
          });
          remainingDesiredUsd -= takeUsd;
        }

        console.log("SWAPPING WITH EXACTIN", {
          from: fromPayload,
          toChainId: toToken.chainId!,
          toTokenAddress: toToken.contractAddress as `0x${string}`,
        });
        swapRunIdRef.current += 1;
        const runId = swapRunIdRef.current;
        setExplorerUrls({ sourceExplorerUrl: null, destinationExplorerUrl: null });
        // Start exact-in swap — the intent hook will fire and populate preview
        await nexusSDK.swapWithExactIn({
          from: fromPayload,
          toChainId: toToken.chainId!,
          toTokenAddress: toToken.contractAddress as `0x${string}`,
        }, {
          onEvent: (event: any) => {
            if (swapRunIdRef.current !== runId) return;
            handleSwapEvent(event);
          }
        });
        // If we reach here, swap completed successfully
        onComplete?.();
        setSwapStep("success");
      } else {
        console.log(
          "[DEBUG] ExactOut detected. Resolving USD rate for:",
          toToken.symbol,
        );
        const usdRate = await resolveTokenUsdRate(toToken.symbol);
        console.log("[DEBUG] USD Rate resolved:", usdRate);
        const exactTokenAmount =
          usdRate && usdRate > 0 ? Number(amount) / usdRate : Number(amount);
        console.log("[DEBUG] exactTokenAmount computed:", exactTokenAmount);

        console.log("[DEBUG] Parsing units using decimals:", toToken.decimals);
        const amountBigInt = nexusSDK.utils.parseUnits(
          exactTokenAmount.toFixed(Math.min(toToken.decimals || 18, 18)),
          toToken.decimals || 18,
        );
        console.log("[DEBUG] amountBigInt generated:", amountBigInt);

        console.log("SWAPPING WITH EXACTOUT", {
          toChainId: toToken.chainId!,
          toTokenAddress: toToken.contractAddress as `0x${string}`,
          toAmount: amountBigInt,
          ...(fromTokens.length > 0
            ? {
                fromSources: fromTokens.map((token) => ({
                  chainId: token.chainId!,
                  tokenAddress: token.contractAddress as `0x${string}`,
                })),
              }
            : {}),
        });
        swapRunIdRef.current += 1;
        const runId = swapRunIdRef.current;
        setExplorerUrls({ sourceExplorerUrl: null, destinationExplorerUrl: null });
        await nexusSDK.swapWithExactOut({
          toChainId: toToken.chainId!,
          toTokenAddress: toToken.contractAddress as `0x${string}`,
          toAmount: amountBigInt,
          ...(fromTokens.length > 0
            ? {
                fromSources: fromTokens.map((token) => ({
                  chainId: token.chainId!,
                  tokenAddress: token.contractAddress as `0x${string}`,
                })),
              }
            : {}),
        }, {
          onEvent: (event: any) => {
            if (swapRunIdRef.current !== runId) return;
            handleSwapEvent(event);
          }
        });
        onComplete?.();
        setSwapStep("success");
      }
    } catch (err: any) {
      console.error("Error in handleEnterPreview:", err);
      if (err?.code === "USER_DENIED_INTENT") {
        setSwapStep("idle");
        return;
      }
      setSwapStep("idle");
      const errorMessage =
        err?.message ||
        (typeof err === "string"
          ? err
          : "Transaction failed. Please try again or check console.");
      setTxError(errorMessage);
      onError?.(errorMessage);
      setIntentLoading(false);
    }
  };

  /** User accepted swap from the preview — call allow() from the intent hook */
  const handleSwapAccept = () => {
    if (swapIntentRef.current) {
      onStart?.();
      setSwapStep("progress");
      seed(SWAP_EXPECTED_STEPS);
      swapIntentRef.current.allow();
      // The swap promise in handleEnterPreview will resolve/reject
    }
  };

  // ---------------------------------------------------------------------------
  // Header title
  // ---------------------------------------------------------------------------
  const getTitle = () => {
    if (activeMode === "swap") {
      if (swapStep === "choose-swap-asset")
        return swapType === "exactIn"
          ? "Choose assets to Swap"
          : "Choose asset to Receive";
      if (swapStep === "choose-receive-asset") return "Choose asset to Receive";
      if (swapStep === "preview-intent") return "Confirm Swap";
      if (swapStep === "progress") return "Swapping…";
      return "Swap";
    }
    if (activeMode === "deposit")
      return selectedOpportunity
        ? `Deposit into ${selectedOpportunity.protocol}`
        : "Deposit to";
    if (activeMode === "transfer") return "Send assets";
    return "Nexus One";
  };

  // Titles that should be center-aligned (main screens / confirm screens)
  // Left-aligned: choose-swap-asset, choose-receive-asset (sub-screens with subtitles)
  const isTitleCentered = () => {
    if (activeMode === "swap") {
      if (
        swapStep === "choose-swap-asset" ||
        swapStep === "choose-receive-asset"
      )
        return false;
      return true; // idle, preview-intent, progress
    }
    return true; // deposit, transfer, etc.
  };

  const canGoBack =
    swapStep !== "idle" || (activeMode === "deposit" && selectedOpportunity);
  const handleBack = () => {
    if (activeMode === "deposit" && selectedOpportunity) {
      setSelectedOpportunity(undefined);
      return;
    }
    if (swapStep === "choose-receive-asset") {
      setSwapStep("idle");
      return;
    }
    if (swapStep === "preview-intent") {
      setSwapStep("idle");
      return;
    }
    if (swapStep === "progress") {
      return;
    } // can't go back during tx
    setSwapStep("idle");
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      className="w-full max-w-sm relative overflow-hidden flex flex-col font-geist"
      style={{
        borderRadius: "16px",
        background: "var(--widget-background, #F9F9F8)",
        boxShadow: "0px 1px 12px 0px #5B5B5B0D",
        border: "1px solid var(--border-default, #E8E8E7)",
      }}
    >
      {/* card-bg.png blended texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none select-none"
        style={{ zIndex: 0 }}
      >
        <img
          src={CardBG.src}
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.4, mixBlendMode: "multiply" }}
        />
      </div>

      {/* All content above texture */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* ------------------------------------------------------------------ */}
        {/* Header */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 relative">
          {/* Left: Back button or placeholder */}
          <div className="flex items-center gap-x-2 z-10">
            {canGoBack ? (
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
            ) : (
              <div></div>
            )}

            {/* Left-aligned title block (sub-screens only) */}
            {!isTitleCentered() && (
              <div className="flex flex-col items-start">
                <h2
                  style={{
                    fontFamily: "var(--font-geist-sans), sans-serif",
                    fontSize: "14px",
                    color: "var(--foreground-primary, #161615)",
                  }}
                >
                  {getTitle()}
                </h2>
                {activeMode === "swap" &&
                  swapStep === "choose-swap-asset" &&
                  swapType === "exactIn" && (
                    <span
                      style={{
                        fontFamily: "var(--font-geist-sans), sans-serif",
                        fontSize: "13px",
                        color: "var(--foreground-muted, #848483)",
                      }}
                    >
                      {fromTokens.length} asset(s) selected
                    </span>
                  )}
              </div>
            )}

          </div>

          {/* Center-aligned title (main screens) */}
          {isTitleCentered() && (
            <div className="absolute inset-x-0 flex items-center justify-center gap-x-2 pointer-events-none">
              <h2
                className="pointer-events-auto"
                style={{
                  fontFamily: "var(--font-geist-sans), sans-serif",
                  fontSize: "14px",
                  color: "var(--foreground-primary, #161615)",
                }}
              >
                {getTitle()}
              </h2>
              {/* Exact In / Exact Out dropdown appended next to Title */}
              {activeMode === "swap" && swapStep === "idle" && (
                <div className="relative pointer-events-auto">
                  <button
                    onClick={() => setSwapTypeOpen((v) => !v)}
                    className="flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-[4px] hover:bg-black/5 transition-colors"
                    style={{
                      fontFamily: "var(--font-geist-mono), sans-serif",
                      fontSize: "10px",
                      fontWeight: 500,
                      color: "var(--foreground-muted, #848483)",
                      background: "var(--background-tertiary, #F0F0EF)",
                    }}
                  >
                    {swapType === "exactIn" ? "ExactIn" : "ExactOut"}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {swapTypeOpen && (
                    <div
                      className="absolute top-full left-0 mt-1 z-50 py-1 min-w-[120px]"
                      style={{
                        background: "#FFFFFF",
                        borderRadius: "10px",
                        border: "1px solid var(--border-default, #E8E8E7)",
                        boxShadow: "0px 4px 16px 0px #00000014",
                      }}
                    >
                      {(["exactIn", "exactOut"] as SwapType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setSwapType(t);
                            setSwapTypeOpen(false);
                            setFromTokens([]);
                            setToToken(undefined);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-black/5 transition-colors"
                          style={{
                            fontFamily: "var(--font-geist-sans), sans-serif",
                            fontSize: "13px",
                            fontWeight: swapType === t ? 600 : 400,
                            color:
                              swapType === t
                                ? "var(--interactive-button-primary-background, #006BF4)"
                                : "var(--foreground-primary, #161615)",
                          }}
                        >
                          {t === "exactIn" ? "Exact In" : "Exact Out"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Close */}
          <button
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Mode tabs — only when multiple modes and on idle/main screens */}
        {/* ------------------------------------------------------------------ */}
        {Array.isArray(config.mode) &&
          config.mode.length > 1 &&
          swapStep === "idle" &&
          !selectedOpportunity && (
            <div className="px-4 pt-3">
              <div
                className="flex items-center p-1 rounded-xl w-full"
                style={{ background: "var(--background-tertiary, #F0F0EF)" }}
              >
                {(config.mode as NexusOneMode[]).map((m: NexusOneMode) => (
                  <button
                    key={m}
                    onClick={() => handleModeChange(m)}
                    className={`flex-1 flex justify-center py-1.5 text-sm font-medium rounded-xl transition-all capitalize ${
                      activeMode === m
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* ------------------------------------------------------------------ */}
        {/* Main content area */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 space-y-3">
          {/* =============================================================== */}
          {/* SWAP MODE                                                        */}
          {/* =============================================================== */}
          {activeMode === "swap" && (
            <>
              {/* Panel: choose-swap-asset */}
              {swapStep === "choose-swap-asset" && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 w-full h-full">
                  <SwapAssetSelector
                    title={
                      swapType === "exactIn"
                        ? "Choose assets to Swap"
                        : "Choose asset to Receive"
                    }
                    swapBalance={swapBalance}
                    isMulti={swapType === "exactIn"}
                    selectedTokens={fromTokens}
                    onToggle={(token) => {
                      setFromTokens((prev) => {
                        const exists = prev.find(
                          (t) =>
                            t.contractAddress === token.contractAddress &&
                            t.chainId === token.chainId,
                        );
                        if (exists)
                          return prev.filter(
                            (t) =>
                              !(
                                t.contractAddress === token.contractAddress &&
                                t.chainId === token.chainId
                              ),
                          );
                        return [...prev, token];
                      });
                    }}
                    onDone={() => setSwapStep("idle")}
                    onSelect={(token) => {
                      if (swapType === "exactIn") {
                        setFromTokens([token]);
                        setSwapStep("choose-receive-asset");
                      } else {
                        setToToken(token);
                        setSwapStep("idle");
                      }
                    }}
                    onBack={() => setSwapStep("idle")}
                  />
                </div>
              )}
              {/* Panel: choose-receive-asset */}
              {swapStep === "choose-receive-asset" && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full -mx-4 -mb-4 -mt-3 flex flex-col bg-[var(--widget-background,#F9F9F8)]">
                  <ReceiveAssetSelector
                    onSelect={(token) => {
                      setToToken(token);
                      setSwapStep("idle");
                    }}
                    onBack={() => setSwapStep("idle")}
                  />
                </div>
              )}
              {/* Panel: preview-intent */}
              {swapStep === "preview-intent" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full">
                  <SwapIntentPreview
                    fromTokens={fromTokens}
                    fromToken={fromTokens[0]}
                    toToken={toToken}
                    fromAmount={amount}
                    fromAmountUsd={amount}
                    toAmount={intentToAmount}
                    toAmountUsd={intentToAmount}
                    toAmountTokens={
                      intentToAmount ? `${intentToAmount}` : undefined
                    }
                    totalFeeUsd={intentFeeUsd}
                    estimatedTime="10s"
                    isLoading={intentLoading}
                    intentData={intentData}
                    swapBalances={swapBalance}
                    supportedTokenAssets={supportedChainsAndTokens}
                    onAccept={handleSwapAccept}
                    onReject={() => {
                      swapIntentRef.current?.deny();
                      swapIntentRef.current = null;
                      setSwapStep("idle");
                    }}
                  />
                </div>
              )}

              {/* Panel: progress AND SUCCESS */}
              {(swapStep === "progress" || swapStep === "success") && (
                 <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                  <TransactionProgress
                    steps={steps}
                    explorerUrls={explorerUrls}
                    sourceSymbol={fromTokens.length > 1 ? `${fromTokens.length} sources` : (fromTokens[0]?.symbol ?? "Unknown")}
                    destinationSymbol={toToken?.symbol ?? "Unknown"}
                    sourceLogos={{
                      token: fromTokens[0]?.logo ?? "",
                      chain: fromTokens[0]?.chainLogo ?? ""
                    }}
                    destinationLogos={{
                      token: toToken?.logo ?? "",
                      chain: toToken?.chainLogo ?? ""
                    }}
                    hasMultipleSources={fromTokens.length > 1}
                    sources={fromTokens.length > 1 ? fromTokens.map((t) => ({
                       tokenLogo: t.logo ?? "",
                       chainLogo: t.chainLogo ?? "",
                       symbol: t.symbol
                    })) : undefined}
                  />
                  {swapStep === "success" && (
                    <Button 
                      onClick={() => handleModeChange(activeMode)} 
                      className="w-full mt-6"
                      style={{
                        background: "var(--interactive-button-primary-background, #006BF4)",
                        color: "var(--foreground-inverse, #F0F0EF)",
                        height: "48px",
                        borderRadius: "12px",
                      }}
                    >
                      Done
                    </Button>
                  )}
                 </div>
              )}

              {/* Main swap idle screen */}
              {swapStep === "idle" && (
                <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-3 w-full">
                  {/* Amount input */}
                  <AmountInputUnified
                    amount={amount}
                    onChange={setAmount}
                    maxAvailableAmount={
                      fromTokens.length > 0
                        ? String(fromTokens[0].balance).replace(/[^0-9.]/g, "")
                        : maxBalance
                    }
                    unifiedBalances={swapBalance!}
                    usdValue={
                      amount && usdValue > 0 ? usdValue.toFixed(2) : undefined
                    }
                    header={
                      swapType === "exactIn" && fromTokens.length > 0
                        ? (() => {
                            const distinctTokens = Array.from(
                              new Map(
                                fromTokens.map((t) => [t.symbol, t]),
                              ).values(),
                            );
                            return (
                              <div
                                onClick={() => setSwapStep("choose-swap-asset")}
                                className="flex items-center gap-x-3 w-full justify-between cursor-pointer group"
                              >
                                <div className="flex items-center gap-x-3 pl-1">
                                  <div className="relative shrink-0 flex items-center -space-x-3">
                                    {distinctTokens.slice(0, 4).map((t, idx) =>
                                      t.logo ? (
                                        <img
                                          key={`${t.contractAddress}-${t.chainId}`}
                                          src={t.logo}
                                          alt={t.symbol}
                                          className="w-9 h-9 rounded-full object-cover relative"
                                          style={{ zIndex: 4 - idx }}
                                          onError={(e) => {
                                            (
                                              e.target as HTMLImageElement
                                            ).style.display = "none";
                                          }}
                                        />
                                      ) : (
                                        <div
                                          key={`${t.contractAddress}-${t.chainId}`}
                                          className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 relative"
                                          style={{ zIndex: 4 - idx }}
                                        >
                                          {t.symbol.slice(0, 2)}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                  <div className="flex flex-col items-start justify-center ml-1">
                                    <span
                                      style={{
                                        fontFamily:
                                          "var(--font-geist-sans), sans-serif",
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        color:
                                          "var(--foreground-primary, #161615)",
                                      }}
                                    >
                                      Swapping
                                    </span>
                                    <span
                                      style={{
                                        fontFamily:
                                          "var(--font-geist-sans), sans-serif",
                                        fontSize: "13px",
                                        color:
                                          "var(--foreground-muted, #848483)",
                                      }}
                                    >
                                      {distinctTokens[0].symbol}
                                      {distinctTokens.length > 1
                                        ? `, ${distinctTokens[1].symbol}`
                                        : ""}
                                      {distinctTokens.length > 2
                                        ? ` +${distinctTokens.length - 2} more`
                                        : ""}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  style={{
                                    fontFamily:
                                      "var(--font-geist-sans), sans-serif",
                                    fontSize: "12px",
                                    color: "var(--foreground-muted, #848483)",
                                  }}
                                  className="group-hover:text-gray-600 transition-colors pr-1"
                                >
                                  Edit
                                </span>
                              </div>
                            );
                          })()
                        : undefined
                    }
                  />

                  {/* Swap asset chip */}
                  {swapType === "exactIn" && fromTokens.length === 0 && (
                    <button
                      onClick={() => setSwapStep("choose-swap-asset")}
                      className="w-full flex items-center p-5 bg-white gap-y-3 min-h-[72px]"
                      style={{
                        borderRadius: "12px",
                        border: "1px solid var(--border-default, #E8E8E7)",
                        boxShadow: "0px 1px 12px 0px #5B5B5B0D",
                        background: "#FFFFFF",
                      }}
                    >
                      <div className="flex items-center gap-x-3 w-full justify-between">
                        <div className="flex gap-4 items-center">
                          <div className="h-6 w-6 rounded-full flex items-center justify-center bg-[#006BF4]">
                            <PlusIcon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              style={{
                                fontFamily:
                                  "var(--font-geist-sans), sans-serif",
                                fontSize: "14px",
                                color: "var(--foreground-primary, #161615)",
                              }}
                            >
                              Swap
                            </span>
                            <span
                              style={{
                                fontFamily:
                                  "var(--font-geist-sans), sans-serif",
                                fontSize: "13px",
                                color:
                                  "var(--widget-card-foreground-muted, #848483)",
                              }}
                            >
                              Choose asset
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Receive asset chip — shown in exactOut ALWAYS, or in exactIn IF fromTokens chosen */}
                  {(swapType === "exactOut" ||
                    (swapType === "exactIn" && fromTokens.length > 0)) && (
                    <button
                      onClick={() => setSwapStep("choose-receive-asset")}
                      className="w-full flex items-center p-5 bg-white gap-y-3 min-h-[72px]"
                      style={{
                        borderRadius: "12px",
                        border: "1px solid var(--border-default, #E8E8E7)",
                        boxShadow: "0px 1px 12px 0px #5B5B5B0D",
                        background: "#FFFFFF",
                      }}
                    >
                      <div className="flex items-center gap-x-3 w-full justify-between">
                        {toToken ? (
                          <div className="flex items-center gap-x-3">
                            <div className="relative shrink-0">
                              {toToken.logo ? (
                                <img
                                  src={toToken.logo}
                                  alt={toToken.symbol}
                                  className="w-9 h-9 rounded-full border border-gray-100 object-cover"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-600">
                                  {toToken.symbol.slice(0, 2)}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-start justify-center">
                              <span
                                style={{
                                  fontFamily:
                                    "var(--font-geist-sans), sans-serif",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color: "var(--foreground-primary, #161615)",
                                }}
                              >
                                {toToken.symbol}
                              </span>
                              {toToken.chainName && (
                                <span
                                  style={{
                                    fontFamily:
                                      "var(--font-geist-sans), sans-serif",
                                    fontSize: "12px",
                                    color: "var(--foreground-muted, #848483)",
                                  }}
                                >
                                  {toToken.chainName}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-4 items-center">
                            <div className="h-6 w-6 rounded-full flex items-center justify-center bg-[#006BF4]">
                              <PlusIcon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                style={{
                                  fontFamily:
                                    "var(--font-geist-sans), sans-serif",
                                  fontSize: "14px",
                                  color: "var(--foreground-primary, #161615)",
                                }}
                              >
                                Receive
                              </span>
                              <span
                                style={{
                                  fontFamily:
                                    "var(--font-geist-sans), sans-serif",
                                  fontSize: "13px",
                                  color:
                                    "var(--widget-card-foreground-muted, #848483)",
                                }}
                              >
                                Choose asset
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-x-1">
                          {toToken && (
                            <span
                              style={{
                                fontFamily:
                                  "var(--font-geist-sans), sans-serif",
                                fontSize: "11px",
                                color:
                                  "var(--interactive-button-primary-background, #006BF4)",
                                fontWeight: 500,
                              }}
                            >
                              Edit
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )}

                  {txError && <StatusAlert type="error" message={txError} />}

                  {/* Proceed to Swap */}
                  <Button
                    onClick={handleEnterPreview}
                    disabled={
                      !amount ||
                      Number(amount) <= 0 ||
                      (swapType === "exactIn" &&
                        (fromTokens.length === 0 || !toToken)) ||
                      (swapType === "exactOut" && !toToken)
                    }
                    className="w-full font-medium text-white transition-opacity hover:opacity-90 active:opacity-100 text-[14px]"
                    style={{
                      background:
                        "var(--interactive-button-primary-background, #006BF4)",
                      boxShadow: "0px 1px 4px 0px #5555550D",
                      height: "48px",
                      borderRadius: "12px",
                    }}
                  >
                    Proceed to Swap
                  </Button>
                </div>
              )}
            </>
          )}

          {/* =============================================================== */}
          {/* DEPOSIT MODE                                                     */}
          {/* =============================================================== */}
          {activeMode === "deposit" && (
            <>
              {/* Opportunity list */}
              {config.opportunities &&
                config.opportunities.length > 0 &&
                !selectedOpportunity && (
                  <>
                    <p
                      className="pb-1"
                      style={{
                        fontFamily: "var(--font-geist-sans), sans-serif",
                        fontSize: "12px",
                        color: "var(--foreground-muted, #848483)",
                      }}
                    >
                      Choose a protocol to deposit into
                    </p>
                    <OpportunityList
                      opportunities={config.opportunities}
                      onSelect={(opp) => setSelectedOpportunity(opp)}
                    />
                  </>
                )}

              {/* After opportunity selected (or no opportunities configured) — show deposit form */}
              {(!config.opportunities ||
                config.opportunities.length === 0 ||
                selectedOpportunity) && (
                <>
                  {selectedOpportunity && (
                    <div
                      className="flex items-center gap-x-2 px-3 py-2 rounded-xl mb-1"
                      style={{
                        background: "var(--background-secondary, #F5F5F4)",
                      }}
                    >
                      {selectedOpportunity.logo && (
                        <img
                          src={selectedOpportunity.logo}
                          alt={selectedOpportunity.protocol}
                          className="w-6 h-6 rounded-full border border-gray-100 object-cover"
                        />
                      )}
                      <span
                        style={{
                          fontFamily: "var(--font-geist-sans), sans-serif",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--foreground-primary, #161615)",
                        }}
                      >
                        {selectedOpportunity.label}
                      </span>
                      {selectedOpportunity.apy && (
                        <span
                          className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: "#ECFDF5", color: "#16A34A" }}
                        >
                          {selectedOpportunity.apy} APY
                        </span>
                      )}
                    </div>
                  )}

                  <AmountInputUnified
                    amount={amount}
                    onChange={setAmount}
                    maxAvailableAmount={maxBalance}
                    unifiedBalances={swapBalance!}
                    usdValue={
                      amount && usdValue > 0 ? usdValue.toFixed(2) : undefined
                    }
                  />

                  <PayUsingSelector
                    label="Paying with"
                    sublabel="Auto-selected based on amount"
                    onClick={() => console.log("Open Pay Using Settings")}
                  />

                  {txError && <StatusAlert type="error" message={txError} />}

                  <Button
                    onClick={handleContinue}
                    className="w-full font-medium text-white transition-opacity hover:opacity-90 active:opacity-100 text-[14px]"
                    style={{
                      background:
                        "var(--interactive-button-primary-background, #006BF4)",
                      boxShadow: "0px 1px 4px 0px #5555550D",
                      height: "48px",
                      borderRadius: "12px",
                    }}
                  >
                    Proceed to Deposit
                  </Button>
                </>
              )}
            </>
          )}

          {/* =============================================================== */}
          {/* TRANSFER MODE — recipient first, then amount, then asset         */}
          {/* =============================================================== */}
          {activeMode === "transfer" && (
            <>
              {/* 1. Recipient input */}
              <div className="flex flex-col gap-y-1">
                <label
                  style={{
                    fontFamily: "var(--font-geist-sans), sans-serif",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--foreground-muted, #848483)",
                  }}
                >
                  To
                </label>
                <RecipientInput
                  value={recipientAddress}
                  onChange={setRecipientAddress}
                  placeholder="ENS name or 0x address"
                  label=""
                />
              </div>

              {/* 2. Amount input + MAX + Balance */}
              <AmountInputUnified
                amount={amount}
                onChange={setAmount}
                maxAvailableAmount={maxBalance}
                unifiedBalances={swapBalance!}
                usdValue={
                  amount && usdValue > 0 ? usdValue.toFixed(2) : undefined
                }
              />

              {/* 3. Send (Choose Asset) */}
              <PayUsingSelector
                label="Send (Choose Asset)"
                sublabel={
                  currentAsset?.symbol
                    ? `Sending ${currentAsset.symbol}`
                    : "Auto-selected based on amount"
                }
                onClick={() => console.log("Open Asset Selector")}
              />

              {txError && <StatusAlert type="error" message={txError} />}

              <Button
                onClick={handleContinue}
                className="w-full font-medium text-white transition-opacity hover:opacity-90 active:opacity-100 text-[14px]"
                style={{
                  background:
                    "var(--interactive-button-primary-background, #006BF4)",
                  boxShadow: "0px 1px 4px 0px #5555550D",
                  height: "48px",
                  borderRadius: "12px",
                }}
              >
                Proceed to Transfer
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default NexusOne;
