"use client";

import React, { useState } from "react";
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
import { SwapIntentPreview } from "./components/swap-intent-preview";
import { OpportunityList } from "./components/opportunity-list";
import { ChevronDown, X, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { useNexus } from "../nexus/NexusProvider";
import CardBG from "./card-bg.png";

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
  const { nexusSDK, bridgableBalance, swapBalance, getFiatValue } = useNexus();

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
  const [fromToken, setFromToken] = useState<SwapTokenOption | undefined>(
    undefined,
  );
  const [toToken, setToToken] = useState<SwapTokenOption | undefined>(
    undefined,
  );
  const [intentToAmount, setIntentToAmount] = useState<string | undefined>(
    undefined,
  );
  const [intentFeeUsd, setIntentFeeUsd] = useState<string | undefined>(
    undefined,
  );
  const [intentLoading, setIntentLoading] = useState(false);

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
    setFromToken(undefined);
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

  /** Simulate/fetch intent when entering preview step */
  const handleEnterPreview = async () => {
    if (!fromToken || !toToken || !amount) return;
    setSwapStep("preview-intent");
    setIntentLoading(true);
    setIntentToAmount(undefined);
    setIntentFeeUsd(undefined);

    // TODO: call nexusSDK.swapWithExactIn / swapWithExactOut to get intent
    // For now simulate a small delay and mock data:
    await new Promise((r) => setTimeout(r, 1200));
    const mockReceive = (Number(amount) * 0.997).toFixed(4);
    setIntentToAmount(mockReceive);
    setIntentFeeUsd("$0.18");
    setIntentLoading(false);
  };

  /** Execute the swap after user accepts the preview */
  const handleSwapAccept = async () => {
    if (!nexusSDK || !fromToken || !toToken || !amount) return;
    onStart?.();
    setSwapStep("progress");

    try {
      const amountBigInt = nexusSDK.utils.parseUnits(
        amount,
        fromToken.decimals || 18,
      );

      if (swapType === "exactIn") {
        await nexusSDK.swapWithExactIn({
          from: [
            {
              chainId: fromToken.chainId!,
              tokenAddress: fromToken.contractAddress as `0x${string}`,
              amount: amountBigInt,
            },
          ],
          toChainId: toToken.chainId!,
          toTokenAddress: toToken.contractAddress as `0x${string}`,
        });
      } else {
        await nexusSDK.swapWithExactOut({
          toChainId: toToken.chainId!,
          toTokenAddress: toToken.contractAddress as `0x${string}`,
          toAmount: amountBigInt,
          ...(fromToken.chainId
            ? {
                fromSources: [
                  {
                    chainId: fromToken.chainId,
                    tokenAddress: fromToken.contractAddress as `0x${string}`,
                  },
                ],
              }
            : {}),
        });
      }

      onComplete?.();
    } catch (err: any) {
      setTxError(err?.message || "Swap failed");
      onError?.(err?.message || "Swap failed");
      setSwapStep("preview-intent");
    }
  };

  // ---------------------------------------------------------------------------
  // Header title
  // ---------------------------------------------------------------------------
  const getTitle = () => {
    if (activeMode === "swap") {
      if (swapStep === "choose-swap-asset")
        return swapType === "exactIn"
          ? "Choose asset to Swap"
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

  const canGoBack =
    swapStep !== "idle" || (activeMode === "deposit" && selectedOpportunity);
  const handleBack = () => {
    if (activeMode === "deposit" && selectedOpportunity) {
      setSelectedOpportunity(undefined);
      return;
    }
    if (swapStep === "choose-receive-asset") {
      setSwapStep("choose-swap-asset");
      return;
    }
    if (swapStep === "preview-intent") {
      setSwapStep(
        swapType === "exactIn" ? "choose-receive-asset" : "choose-swap-asset",
      );
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
        <div
          className="flex items-center justify-between px-4 pt-4 pb-3"
          // style={{ borderBottom: "1px solid var(--border-default, #E8E8E7)" }}
        >
          {/* Back button or logo */}
          {canGoBack ? (
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
          ) : (
            // <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            //   <div className="w-4 h-4 rounded-full border-2 border-current" />
            // </div>
            <div></div>
          )}

          {/* Title + Swap type dropdown */}
          <div className="flex items-center gap-x-2">
            <h2
              style={{
                fontFamily: "var(--font-geist-sans), sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                color: "var(--foreground-primary, #161615)",
              }}
            >
              {getTitle()}
            </h2>

            {/* Exact In / Exact Out dropdown — only on main swap screen */}
            {activeMode === "swap" && swapStep === "idle" && (
              <div className="relative">
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
                          setFromToken(undefined);
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

          {/* Close */}
          <button
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
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
                <SwapAssetSelector
                  title={
                    swapType === "exactIn"
                      ? "Swap (Choose Asset)"
                      : "Receive (Choose Asset)"
                  }
                  swapBalance={swapBalance}
                  onSelect={(token) => {
                    if (swapType === "exactIn") {
                      setFromToken(token);
                      setSwapStep("choose-receive-asset");
                    } else {
                      setToToken(token);
                      setSwapStep("idle");
                    }
                  }}
                  onBack={() => setSwapStep("idle")}
                />
              )}

              {/* Panel: choose-receive-asset */}
              {swapStep === "choose-receive-asset" && (
                <SwapAssetSelector
                  title="Receive (Choose Asset)"
                  swapBalance={swapBalance}
                  onSelect={(token) => {
                    setToToken(token);
                    setSwapStep("idle");
                  }}
                  onBack={() => setSwapStep("choose-swap-asset")}
                />
              )}

              {/* Panel: preview-intent */}
              {swapStep === "preview-intent" && (
                <SwapIntentPreview
                  fromToken={fromToken}
                  toToken={toToken}
                  fromAmount={amount}
                  toAmount={intentToAmount}
                  totalFeeUsd={intentFeeUsd}
                  isLoading={intentLoading}
                  onAccept={handleSwapAccept}
                  onReject={() => setSwapStep("idle")}
                />
              )}

              {/* Panel: progress */}
              {swapStep === "progress" && (
                <div className="flex flex-col items-center justify-center py-8 gap-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
                  <p
                    style={{
                      fontFamily: "var(--font-geist-sans), sans-serif",
                      fontSize: "14px",
                      color: "var(--foreground-muted, #848483)",
                    }}
                  >
                    Swapping {fromToken?.symbol} → {toToken?.symbol}…
                  </p>
                </div>
              )}

              {/* Main swap idle screen */}
              {swapStep === "idle" && (
                <>
                  {/* Amount input */}
                  <AmountInputUnified
                    amount={amount}
                    onChange={setAmount}
                    maxAvailableAmount={
                      fromToken
                        ? String(fromToken.balance).replace(/[^0-9.]/g, "")
                        : maxBalance
                    }
                    unifiedBalances={swapBalance!}
                    usdValue={
                      amount && usdValue > 0 ? usdValue.toFixed(2) : undefined
                    }
                  />

                  {/* Swap asset chip */}
                  <button
                    onClick={() => setSwapStep("choose-swap-asset")}
                    className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-black/5"
                    style={{
                      background: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid var(--border-default, #E8E8E7)",
                    }}
                  >
                    <div className="flex items-center gap-x-3">
                      {fromToken ? (
                        <>
                          {fromToken.logo ? (
                            <img
                              src={fromToken.logo}
                              alt={fromToken.symbol}
                              className="w-7 h-7 rounded-full border border-gray-100 object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                              {fromToken.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div className="flex flex-col items-start">
                            <span
                              style={{
                                fontFamily:
                                  "var(--font-geist-sans), sans-serif",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "var(--foreground-primary, #161615)",
                              }}
                            >
                              {fromToken.symbol}
                            </span>
                            {fromToken.chainName && (
                              <span
                                style={{
                                  fontFamily:
                                    "var(--font-geist-sans), sans-serif",
                                  fontSize: "11px",
                                  color: "var(--foreground-muted, #848483)",
                                }}
                              >
                                {fromToken.chainName}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <span
                          style={{
                            fontFamily: "var(--font-geist-sans), sans-serif",
                            fontSize: "13px",
                            color: "var(--foreground-muted, #848483)",
                          }}
                        >
                          {swapType === "exactIn"
                            ? "Swap (Choose Asset)"
                            : "Paying with (auto)"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-x-1">
                      {fromToken && (
                        <span
                          style={{
                            fontFamily: "var(--font-geist-sans), sans-serif",
                            fontSize: "11px",
                            color:
                              "var(--interactive-button-primary-background, #006BF4)",
                            fontWeight: 500,
                          }}
                        >
                          Edit
                        </span>
                      )}
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>

                  {/* Receive asset chip — only for exactIn after source is chosen */}
                  {swapType === "exactIn" && (
                    <button
                      onClick={() => setSwapStep("choose-receive-asset")}
                      className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-black/5"
                      style={{
                        background: "#FFFFFF",
                        borderRadius: "12px",
                        border: "1px solid var(--border-default, #E8E8E7)",
                      }}
                    >
                      <div className="flex items-center gap-x-3">
                        {toToken ? (
                          <>
                            {toToken.logo ? (
                              <img
                                src={toToken.logo}
                                alt={toToken.symbol}
                                className="w-7 h-7 rounded-full border border-gray-100 object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-600">
                                {toToken.symbol.slice(0, 2)}
                              </div>
                            )}
                            <div className="flex flex-col items-start">
                              <span
                                style={{
                                  fontFamily:
                                    "var(--font-geist-sans), sans-serif",
                                  fontSize: "13px",
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
                                    fontSize: "11px",
                                    color: "var(--foreground-muted, #848483)",
                                  }}
                                >
                                  {toToken.chainName}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span
                            style={{
                              fontFamily: "var(--font-geist-sans), sans-serif",
                              fontSize: "13px",
                              color: "var(--foreground-muted, #848483)",
                            }}
                          >
                            Receive (Choose Asset)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-x-1">
                        {toToken && (
                          <span
                            style={{
                              fontFamily: "var(--font-geist-sans), sans-serif",
                              fontSize: "11px",
                              color:
                                "var(--interactive-button-primary-background, #006BF4)",
                              fontWeight: 500,
                            }}
                          >
                            Edit
                          </span>
                        )}
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  )}

                  {/* Exact Out — only "Receive" chip first, then from is auto */}
                  {swapType === "exactOut" && (
                    <button
                      onClick={() => setSwapStep("choose-swap-asset")}
                      className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-black/5"
                      style={{
                        background: "#FFFFFF",
                        borderRadius: "12px",
                        border: "1px solid var(--border-default, #E8E8E7)",
                      }}
                    >
                      <div className="flex items-center gap-x-3">
                        {toToken ? (
                          <>
                            {toToken.logo ? (
                              <img
                                src={toToken.logo}
                                alt={toToken.symbol}
                                className="w-7 h-7 rounded-full border border-gray-100 object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-600">
                                {toToken.symbol.slice(0, 2)}
                              </div>
                            )}
                            <div className="flex flex-col items-start">
                              <span
                                style={{
                                  fontFamily:
                                    "var(--font-geist-sans), sans-serif",
                                  fontSize: "13px",
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
                                    fontSize: "11px",
                                    color: "var(--foreground-muted, #848483)",
                                  }}
                                >
                                  {toToken.chainName}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span
                            style={{
                              fontFamily: "var(--font-geist-sans), sans-serif",
                              fontSize: "13px",
                              color: "var(--foreground-muted, #848483)",
                            }}
                          >
                            Receive (Choose Asset)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-x-1">
                        {toToken && (
                          <span
                            style={{
                              fontFamily: "var(--font-geist-sans), sans-serif",
                              fontSize: "11px",
                              color:
                                "var(--interactive-button-primary-background, #006BF4)",
                              fontWeight: 500,
                            }}
                          >
                            Edit
                          </span>
                        )}
                        <ChevronDown className="w-4 h-4 text-gray-400" />
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
                      (swapType === "exactIn" && (!fromToken || !toToken)) ||
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
                </>
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
                    bridgableBalance={currentAsset}
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
                bridgableBalance={currentAsset}
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
