"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import WidgetHeader from "./widget-header";
import type { DepositWidgetContextValue } from "../types";
import type { UseMeldReturn } from "../hooks/use-meld";
import { CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { TOKEN_IMAGES } from "../constants/assets";
import { MELD_CONFIG, getMeldCurrencyCode, CHAIN_ID_TO_NAME } from "../constants/meld";
import { ChevronDownIcon, InfoIcon } from "./icons";

interface BuyCryptoContainerProps {
  widget: DepositWidgetContextValue;
  meld: UseMeldReturn;
  heading?: string;
  onClose?: () => void;
}

function formatEstTime(seconds: number | undefined | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `~${seconds}s`;
  const mins = Math.round(seconds / 60);
  return `~${mins} min`;
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPaymentMethodName(method: string): string {
  return method
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAYMENT_METHOD_ICONS: Record<string, string> = {
  CREDIT_DEBIT_CARD: "💳",
  APPLE_PAY: "\uF8FF",  // Apple logo
  GOOGLE_PAY: "G",
  BANK_TRANSFER: "🏦",
  ACH: "🏦",
  WIRE_TRANSFER: "🏦",
  SEPA: "🏦",
  PIX: "🏦",
};

function PaymentMethodIcon({ method }: { method: string }) {
  // SVG icons for common methods
  if (method === "APPLE_PAY") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M17.72 7.54c-.92-1.13-2.14-1.78-3.05-1.78-1.43.06-2.05.85-3.05.85-.98 0-2.07-.82-3.22-.8C6.63 5.85 4.97 7 4.07 8.72c-1.85 3.27-.47 8.12 1.33 10.78.88 1.28 1.93 2.72 3.31 2.67 1.33-.05 1.83-.86 3.43-.86 1.6 0 2.06.86 3.46.83 1.43-.02 2.34-1.3 3.22-2.59.65-.93 1.12-1.82 1.37-2.37-3.34-1.3-3.47-6.24-.16-7.64z"/>
        <path d="M14.99 3.23c.67-.87 1.17-2.07 1.01-3.23-1.01.07-2.22.73-2.92 1.58-.65.77-1.21 1.99-1.01 3.14 1.12.03 2.24-.64 2.92-1.49z"/>
      </svg>
    );
  }
  if (method === "CREDIT_DEBIT_CARD") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    );
  }
  if (method === "GOOGLE_PAY") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
      </svg>
    );
  }
  if (["BANK_TRANSFER", "ACH", "WIRE_TRANSFER", "SEPA", "PIX"].includes(method)) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M8 10v11M12 10v11M16 10v11M20 10v11" />
      </svg>
    );
  }
  return null;
}

const BuyCryptoContainer = ({
  widget,
  meld,
  onClose,
}: BuyCryptoContainerProps) => {
  const [countdown, setCountdown] = useState(
    MELD_CONFIG.quoteRefreshIntervalMs / 1000,
  );
  const [expandedSection, setExpandedSection] = useState<"currency" | "payment" | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoadedConfig = useRef(false);
  const hasFetchedQuote = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const tokenSymbol = widget.destination.tokenSymbol;
  const amount = widget.inputs.amount ?? "";
  const amountNum = Number.parseFloat(amount) || 0;
  const chainId = widget.destination.chainId;
  const chainName = CHAIN_ID_TO_NAME[chainId] ?? `Chain ${chainId}`;
  const meldCurrencyCode = getMeldCurrencyCode(tokenSymbol, chainId);

  // Load Meld config (currencies, payment methods, defaults) on mount
  useEffect(() => {
    if (hasLoadedConfig.current) return;
    hasLoadedConfig.current = true;
    void meld.loadConfig("US", meldCurrencyCode);
  }, [meld.loadConfig, meldCurrencyCode]);

  const buildQuoteParams = useCallback(
    () => ({
      sourceAmount: amountNum,
      sourceCurrencyCode: meld.selectedCurrency || "USD",
      destinationCurrencyCode: meldCurrencyCode,
      countryCode: "US",
      paymentMethodType: meld.selectedPaymentMethod || "CREDIT_DEBIT_CARD",
    }),
    [amountNum, meldCurrencyCode, meld.selectedCurrency, meld.selectedPaymentMethod],
  );

  // Fetch quote once config is loaded and we have an amount
  useEffect(() => {
    if (hasFetchedQuote.current || amountNum <= 0 || meld.isLoadingConfig) return;
    if (!meld.selectedCurrency) return;
    hasFetchedQuote.current = true;
    void meld.fetchQuote(buildQuoteParams());
  }, [amountNum, meld.isLoadingConfig, meld.selectedCurrency, meld.fetchQuote, buildQuoteParams]);

  // Re-fetch quote when currency, payment method, or amount changes (debounced)
  const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hasFetchedQuote.current) return;
    if (amountNum <= 0) return;
    if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    quoteDebounceRef.current = setTimeout(() => {
      void meld.fetchQuote(buildQuoteParams());
    }, 300);
    return () => {
      if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    };
  }, [meld.selectedCurrency, meld.selectedPaymentMethod, amountNum, meld.fetchQuote, buildQuoteParams]);

  // Countdown timer for quote refresh
  useEffect(() => {
    setCountdown(MELD_CONFIG.quoteRefreshIntervalMs / 1000);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          void meld.fetchQuote(buildQuoteParams());
          return MELD_CONFIG.quoteRefreshIntervalMs / 1000;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [meld.fetchQuote, buildQuoteParams]);

  const handleCurrencyChange = useCallback(
    (currencyCode: string) => {
      setExpandedSection(null);
      hasFetchedQuote.current = false;
      void meld.setSelectedCurrency(currencyCode, meldCurrencyCode);
    },
    [meld.setSelectedCurrency, meldCurrencyCode],
  );

  const handlePaymentMethodChange = useCallback(
    (method: string) => {
      setExpandedSection(null);
      meld.setSelectedPaymentMethod(method);
    },
    [meld.setSelectedPaymentMethod],
  );

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Allow digits and one decimal point
      if (val === "" || /^\d*\.?\d*$/.test(val)) {
        widget.setInputs({ amount: val });
      }
    },
    [widget],
  );

  const quote = meld.quote;
  const currencyCode = meld.selectedCurrency || "USD";

  const selectedCurrencyObj = meld.fiatCurrencies.find(
    (c) => c.currencyCode === meld.selectedCurrency,
  );
  const currencyLabel = selectedCurrencyObj
    ? selectedCurrencyObj.currencyName
      ? `${selectedCurrencyObj.currencyCode} - ${selectedCurrencyObj.currencyName}`
      : selectedCurrencyObj.currencyCode
    : meld.selectedCurrency || "Select currency";

  const paymentLabel = meld.selectedPaymentMethod
    ? formatPaymentMethodName(meld.selectedPaymentMethod)
    : "Select payment method";
  const noPaymentMethods = !meld.isLoadingConfig && meld.paymentMethods.length === 0;

  return (
    <>
      <WidgetHeader
        title="Buy crypto"
        onBack={() => widget.goBack()}
        onClose={onClose}
      />
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Anchor block with editable fiat amount */}
          <div className="bg-base rounded-lg border border-border shadow-[0_1px_12px_0_rgba(91,91,91,0.05)] px-6 py-5 flex flex-col items-center gap-1.5">
            <div className="flex items-baseline">
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="font-display text-2xl font-medium tracking-[0.36px] bg-transparent border-none outline-none text-right min-w-0 p-0"
                style={{ width: `${Math.max(1, (amount || "0").length) * 0.65 + 0.3}em` }}
              />
              <span className="font-display text-2xl font-medium tracking-[0.36px] text-muted-foreground ml-1">
                {currencyCode}
              </span>
            </div>
            <span className="text-sm text-muted-foreground font-sans flex items-center gap-1.5">
              {quote ? (
                <>
                  ≈ {quote.destinationAmount} {tokenSymbol}
                  {TOKEN_IMAGES[tokenSymbol] && (
                    <img
                      src={TOKEN_IMAGES[tokenSymbol]}
                      width={16}
                      height={16}
                      className="h-4 w-4 rounded-full inline"
                      alt={tokenSymbol}
                    />
                  )}
                  on {chainName}
                </>
              ) : meld.isLoadingQuote ? (
                "Fetching quote..."
              ) : amountNum > 0 ? (
                `≈ ? ${tokenSymbol} on ${chainName}`
              ) : (
                `${tokenSymbol} on ${chainName}`
              )}
            </span>
          </div>

          {/* Currency selector — accordion style */}
          <div className="rounded-lg border border-border overflow-hidden">
            <button
              className="w-full bg-base p-4 flex justify-between items-center cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() =>
                setExpandedSection(expandedSection === "currency" ? null : "currency")
              }
            >
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[13px] text-muted-foreground font-sans">
                  Currency
                </span>
                <span className="text-sm text-card-foreground font-sans">
                  {meld.isLoadingConfig ? "Loading..." : currencyLabel}
                </span>
              </div>
              <ChevronDownIcon
                size={20}
                className={`text-muted-foreground transition-transform duration-200 ${expandedSection === "currency" ? "rotate-180" : ""}`}
              />
            </button>
            {expandedSection === "currency" && meld.fiatCurrencies.length > 0 && (
              <div className="border-t border-border max-h-40 overflow-y-auto scrollbar-hide">
                {meld.fiatCurrencies.map((currency) => (
                  <button
                    key={currency.currencyCode}
                    className={`w-full px-4 py-3 text-left text-sm font-sans cursor-pointer hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${
                      currency.currencyCode === meld.selectedCurrency
                        ? "text-card-foreground bg-muted/30"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => handleCurrencyChange(currency.currencyCode)}
                  >
                    {currency.currencyName ? `${currency.currencyCode} - ${currency.currencyName}` : currency.currencyCode}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment method selector — accordion style */}
          <div className={`rounded-lg border border-border overflow-hidden ${noPaymentMethods ? "opacity-50 pointer-events-none" : ""}`}>
            <button
              className="w-full bg-base p-4 flex justify-between items-center cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() =>
                !noPaymentMethods && setExpandedSection(expandedSection === "payment" ? null : "payment")
              }
            >
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[13px] text-muted-foreground font-sans">
                  Pay with
                </span>
                <span className="text-sm text-card-foreground font-sans flex items-center gap-2">
                  {!meld.isLoadingConfig && meld.selectedPaymentMethod && (
                    <PaymentMethodIcon method={meld.selectedPaymentMethod} />
                  )}
                  {meld.isLoadingConfig ? "Loading..." : noPaymentMethods ? "No methods available" : paymentLabel}
                </span>
              </div>
              <ChevronDownIcon
                size={20}
                className={`text-muted-foreground transition-transform duration-200 ${expandedSection === "payment" ? "rotate-180" : ""}`}
              />
            </button>
            {expandedSection === "payment" && meld.paymentMethods.length > 0 && (
              <div className="border-t border-border max-h-40 overflow-y-auto scrollbar-hide">
                {meld.paymentMethods.map((method) => (
                  <button
                    key={method.paymentMethod}
                    className={`w-full px-4 py-3 text-left text-sm font-sans cursor-pointer hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${
                      method.paymentMethod === meld.selectedPaymentMethod
                        ? "text-card-foreground bg-muted/30"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => handlePaymentMethodChange(method.paymentMethod)}
                  >
                    <span className="flex items-center gap-2">
                      <PaymentMethodIcon method={method.paymentMethod} />
                      {method.paymentMethodName || formatPaymentMethodName(method.paymentMethod)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quote card + Continue */}
          <div className="flex flex-col">
            <div className="bg-base rounded-t-lg border border-border shadow-[0_1px_12px_0_rgba(91,91,91,0.05)] p-4 flex flex-col gap-3">
              {meld.isLoadingQuote && !quote ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : quote ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold leading-none px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
                        Best rate
                      </span>
                      <span className="text-sm text-muted-foreground font-sans">
                        via {quote.serviceProviderName || quote.serviceProvider}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[13px] text-muted-foreground font-sans tabular-nums">
                        {countdown}s
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground font-sans">You pay</span>
                      <span className="text-sm text-card-foreground font-sans tabular-nums">
                        {formatUsd(quote.sourceAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground font-sans">Fees</span>
                      <span className="text-sm text-muted-foreground font-sans tabular-nums">
                        -{formatUsd(quote.totalFee)}
                      </span>
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex justify-between">
                      <span className="text-sm text-card-foreground font-sans font-medium">You receive</span>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-sm text-card-foreground font-sans font-medium tabular-nums">
                          {quote.destinationAmount} {tokenSymbol}
                        </span>
                        <span className="text-[12px] text-muted-foreground font-sans tabular-nums">
                          (1 {tokenSymbol} ≈ {formatUsd(quote.exchangeRate)})
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : meld.error ? (
                <div className="flex items-start gap-2 py-1">
                  <InfoIcon size={16} className="text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-amber-400 font-sans">
                    {meld.error}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground font-sans text-center py-2">
                  No quotes available
                </div>
              )}
            </div>
            <Button
              className="rounded-t-none"
              onClick={() => widget.goToStep("buy-crypto-confirm")}
              disabled={!quote || meld.isLoadingQuote}
            >
              Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
};

export default BuyCryptoContainer;
