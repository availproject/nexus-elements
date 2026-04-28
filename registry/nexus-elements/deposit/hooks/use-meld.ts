"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  MELD_CONFIG,
  INITIAL_MELD_STATE,
  type MeldState,
  type MeldQuote,
  type MeldQuoteRequest,
  type MeldQuoteResponse,
  type MeldSessionRequest,
  type MeldSessionResponse,
  type MeldTransaction,
  type MeldCountryDefaults,
  type MeldFiatCurrency,
  type MeldPaymentMethod,
  type MeldPurchaseLimits,
} from "../constants/meld";

async function meldFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${MELD_CONFIG.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Meld API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

function selectBestQuote(quotes: MeldQuote[]): MeldQuote | null {
  if (quotes.length === 0) return null;
  return [...quotes].sort((a, b) => {
    if (b.rampScore !== a.rampScore) return b.rampScore - a.rampScore;
    return b.destinationAmount - a.destinationAmount;
  })[0];
}

export function useMeld() {
  const [state, setState] = useState<MeldState>(INITIAL_MELD_STATE);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quoteRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetMeld = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (quoteRefreshRef.current) clearInterval(quoteRefreshRef.current);
    pollIntervalRef.current = null;
    quoteRefreshRef.current = null;
    setState(INITIAL_MELD_STATE);
  }, []);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (quoteRefreshRef.current) clearInterval(quoteRefreshRef.current);
    };
  }, []);

  // --- Service Provider Config APIs ---

  const fetchCountryDefaults = useCallback(async (countryCode: string) => {
    try {
      const data = await meldFetch<MeldCountryDefaults[]>(
        `/service-providers/properties/defaults/by-country?countries=${countryCode}&accountFilter=true`,
      );
      const defaults = data?.[0] ?? null;
      if (defaults) {
        setState((s) => ({
          ...s,
          countryDefaults: defaults,
          selectedCurrency: defaults.defaultCurrencyCode,
          selectedPaymentMethod: defaults.defaultPaymentMethods?.[0] ?? "",
        }));
      }
      return defaults;
    } catch {
      return null;
    }
  }, []);

  const fetchFiatCurrencies = useCallback(async (countryCode: string, cryptoCurrency?: string) => {
    try {
      let url = `/service-providers/properties/fiat-currencies?countries=${countryCode}&accountFilter=true`;
      if (cryptoCurrency) {
        url += `&cryptoCurrencies=${cryptoCurrency}`;
      }
      const data = await meldFetch<MeldFiatCurrency[] | { fiatCurrencies: MeldFiatCurrency[] }>(url);
      const currencies = Array.isArray(data) ? data : (data.fiatCurrencies ?? []);
      currencies.sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
      setState((s) => ({ ...s, fiatCurrencies: currencies }));
      return currencies;
    } catch {
      return [];
    }
  }, []);

  const fetchPaymentMethods = useCallback(async (fiatCurrency: string, cryptoCurrency?: string) => {
    try {
      let url = `/service-providers/properties/payment-methods?fiatCurrencies=${fiatCurrency}&accountFilter=true`;
      if (cryptoCurrency) {
        url += `&cryptoCurrencies=${cryptoCurrency}`;
      }
      const data = await meldFetch<MeldPaymentMethod[] | { paymentMethods: MeldPaymentMethod[] }>(url);
      const methods = Array.isArray(data) ? data : (data.paymentMethods ?? []);
      methods.sort((a, b) => (a.paymentMethodName || a.paymentMethod).localeCompare(b.paymentMethodName || b.paymentMethod));
      setState((s) => ({ ...s, paymentMethods: methods }));
      return methods;
    } catch {
      setState((s) => ({ ...s, paymentMethods: [] }));
      return [];
    }
  }, []);

  const fetchLimits = useCallback(async () => {
    try {
      const data = await meldFetch<MeldPurchaseLimits | { limits: MeldPurchaseLimits }>(
        `/service-providers/limits/fiat-currency-purchases?accountFilter=true`,
      );
      const limits = "limits" in data ? data.limits : data;
      setState((s) => ({ ...s, limits }));
      return limits;
    } catch {
      return null;
    }
  }, []);

  const loadConfig = useCallback(async (countryCode: string, cryptoCurrency?: string) => {
    setState((s) => ({ ...s, isLoadingConfig: true }));
    const defaults = await fetchCountryDefaults(countryCode);
    const currencyCode = defaults?.defaultCurrencyCode ?? "USD";
    await Promise.all([
      fetchFiatCurrencies(countryCode, cryptoCurrency),
      fetchPaymentMethods(currencyCode, cryptoCurrency),
      fetchLimits(),
    ]);
    setState((s) => ({ ...s, isLoadingConfig: false }));
  }, [fetchCountryDefaults, fetchFiatCurrencies, fetchPaymentMethods, fetchLimits]);

  const setSelectedCurrency = useCallback(async (currencyCode: string, cryptoCurrency?: string) => {
    setState((s) => ({ ...s, selectedCurrency: currencyCode }));
    // Changing currency may change available payment methods
    const methods = await fetchPaymentMethods(currencyCode, cryptoCurrency);
    if (methods.length > 0) {
      setState((s) => ({
        ...s,
        selectedPaymentMethod: methods[0].paymentMethod,
      }));
    } else {
      setState((s) => ({ ...s, selectedPaymentMethod: "" }));
    }
  }, [fetchPaymentMethods]);

  const setSelectedPaymentMethod = useCallback((method: string) => {
    setState((s) => ({ ...s, selectedPaymentMethod: method }));
  }, []);

  // --- Quote API ---

  const fetchQuote = useCallback(async (params: MeldQuoteRequest) => {
    setState((s) => ({ ...s, isLoadingQuote: true, error: null }));
    try {
      const data = await meldFetch<MeldQuoteResponse>(
        "/payments/crypto/quote",
        {
          method: "POST",
          body: JSON.stringify(params),
        },
      );
      const quotes = data.quotes ?? [];
      const best = selectBestQuote(quotes);
      setState((s) => ({
        ...s,
        quote: best,
        allQuotes: quotes,
        isLoadingQuote: false,
        error: quotes.length === 0 ? "No quotes available for this amount" : null,
      }));
      return best;
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to fetch quote";
      // Parse friendly message from Meld error
      let message = raw;
      try {
        const jsonStart = raw.indexOf("{");
        const jsonEnd = raw.lastIndexOf("}");
        const jsonMatch = jsonStart >= 0 && jsonEnd > jsonStart ? [raw.slice(jsonStart, jsonEnd + 1)] : null;
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          message = parsed.errors?.[0] ?? parsed.message ?? raw;
        }
      } catch {
        // Use raw message
      }
      // Friendly messages for known errors
      if (message.includes("Incompatible request") || message.includes("does not match service providers")) {
        message = "This currency isn't supported for this token. Try a different currency.";
      }
      setState((s) => ({ ...s, isLoadingQuote: false, error: message, quote: null, allQuotes: [] }));
      return null;
    }
  }, []);

  const startQuoteRefresh = useCallback(
    (params: MeldQuoteRequest, onRefresh?: (quote: MeldQuote | null) => void) => {
      if (quoteRefreshRef.current) clearInterval(quoteRefreshRef.current);
      quoteRefreshRef.current = setInterval(async () => {
        const quote = await fetchQuote(params);
        onRefresh?.(quote);
      }, MELD_CONFIG.quoteRefreshIntervalMs);
    },
    [fetchQuote],
  );

  const stopQuoteRefresh = useCallback(() => {
    if (quoteRefreshRef.current) {
      clearInterval(quoteRefreshRef.current);
      quoteRefreshRef.current = null;
    }
  }, []);

  // --- Session API ---

  const createSession = useCallback(async (params: MeldSessionRequest) => {
    setState((s) => ({ ...s, isLoadingSession: true, error: null }));
    try {
      const data = await meldFetch<MeldSessionResponse>(
        "/crypto/session/widget",
        {
          method: "POST",
          body: JSON.stringify(params),
        },
      );
      setState((s) => ({
        ...s,
        sessionId: data.id,
        providerWidgetUrl: data.serviceProviderWidgetUrl || data.widgetUrl,
        isLoadingSession: false,
      }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      setState((s) => ({ ...s, isLoadingSession: false, error: message }));
      return null;
    }
  }, []);

  // --- Transaction polling ---

  const pollTransactionStatus = useCallback(
    (transactionId: string, onUpdate?: (tx: MeldTransaction) => void) => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setState((s) => ({ ...s, transactionId }));

      const poll = async () => {
        try {
          const tx = await meldFetch<MeldTransaction>(
            `/payments/transactions/${transactionId}`,
          );
          setState((s) => ({ ...s, transaction: tx }));
          onUpdate?.(tx);

          if (
            tx.status === "COMPLETED" ||
            tx.status === "SETTLED" ||
            tx.status === "FAILED" ||
            tx.status === "CANCELLED"
          ) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        } catch {
          // Silently retry on poll failure
        }
      };

      void poll();
      pollIntervalRef.current = setInterval(poll, MELD_CONFIG.statusPollIntervalMs);
    },
    [],
  );

  const openProviderWidget = useCallback((url: string) => {
    const left = (window.screen.width - MELD_CONFIG.providerPopupWidth) / 2;
    const top = (window.screen.height - MELD_CONFIG.providerPopupHeight) / 2;
    window.open(
      url,
      "meld-provider",
      `width=${MELD_CONFIG.providerPopupWidth},height=${MELD_CONFIG.providerPopupHeight},left=${left},top=${top}`,
    );
  }, []);

  return {
    ...state,
    fetchQuote,
    startQuoteRefresh,
    stopQuoteRefresh,
    createSession,
    pollTransactionStatus,
    openProviderWidget,
    resetMeld,
    loadConfig,
    setSelectedCurrency,
    setSelectedPaymentMethod,
    fetchPaymentMethods,
  };
}

export type UseMeldReturn = ReturnType<typeof useMeld>;
