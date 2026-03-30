"use client";
import {
  type EthereumProvider,
  type NexusNetwork,
  createNexusClient,
  type OnAllowanceHookData,
  type OnIntentHookData,
  type OnSwapIntentHookData,
  type SwapAndExecuteOnIntentHookData,
  type UserAssetDatum,
} from "@avail-project/nexus-sdk-v2";

import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccountEffect } from "wagmi";
import {
  DEFAULT_USD_PEGGED_TOKEN_SYMBOLS,
  USD_PEGGED_FALLBACK_RATE,
  buildUsdPeggedSymbolSet,
  fetchCoinbaseUsdRate,
  getCoinbaseSymbolCandidates,
  normalizeTokenSymbol,
  toFinitePositiveNumber,
} from "../common/utils/token-pricing";

type NexusClient = ReturnType<typeof createNexusClient>;
type SupportedChainsResult = ReturnType<NexusClient["getSupportedChains"]>;

interface NexusContextType {
  nexusClient: NexusClient | null;
  /** @deprecated use nexusClient */
  nexusSDK: NexusClient | null;
  bridgableBalance: UserAssetDatum[] | null;
  swapBalance: UserAssetDatum[] | null;
  intent: RefObject<OnIntentHookData | null>;
  allowance: RefObject<OnAllowanceHookData | null>;
  swapIntent: RefObject<SwapAndExecuteOnIntentHookData | null>;
  /** Intent ref for the pure swap widget (swapWithExactIn/Out flows) */
  swapWidgetIntent: RefObject<OnSwapIntentHookData | null>;
  exchangeRate: Record<string, number> | null;
  supportedChainsAndTokens: SupportedChainsResult | null;
  swapSupportedChainsAndTokens: SupportedChainsResult | null;
  network?: NexusNetwork;
  loading: boolean;
  handleInit: (provider: EthereumProvider) => Promise<void>;
  fetchBridgableBalance: () => Promise<void>;
  fetchSwapBalance: () => Promise<void>;
  getFiatValue: (amount: number, token: string) => number;
  resolveTokenUsdRate: (tokenSymbol: string) => Promise<number | null>;
  initializeNexus: (provider: EthereumProvider) => Promise<void>;
  deinitializeNexus: () => Promise<void>;
  attachEventHooks: () => void;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

type NexusProviderProps = {
  children: React.ReactNode;
  config?: {
    network?: NexusNetwork;
    debug?: boolean;
  };
};

const defaultConfig: Required<NexusProviderProps["config"]> = {
  network: "mainnet",
  debug: false,
};

const NexusProvider = ({
  children,
  config = defaultConfig,
}: NexusProviderProps) => {
  const stableConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config],
  );

  const clientRef = useRef<NexusClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = createNexusClient({ ...stableConfig });
  }
  const client = clientRef.current;

  const [nexusClient, setNexusClient] = useState<NexusClient | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const supportedChainsAndTokens = useRef<SupportedChainsResult | null>(null);
  const swapSupportedChainsAndTokens = useRef<SupportedChainsResult | null>(null);
  const [bridgableBalance, setBridgableBalance] = useState<UserAssetDatum[] | null>(null);
  const [swapBalance, setSwapBalance] = useState<UserAssetDatum[] | null>(null);
  const [exchangeRateState, setExchangeRateState] = useState<Record<
    string,
    number
  > | null>(null);
  const exchangeRate = useRef<Record<string, number> | null>(null);
  const coinbaseUsdRateCache = useRef<Record<string, number>>({});
  const coinbaseUsdRateRequests = useRef<
    Record<string, Promise<number | null>>
  >({});
  const usdPeggedSymbols = useRef<Set<string>>(
    new Set(DEFAULT_USD_PEGGED_TOKEN_SYMBOLS),
  );

  const intent = useRef<OnIntentHookData | null>(null);
  const allowance = useRef<OnAllowanceHookData | null>(null);
  // swapIntent is set by the deposit widget's swapAndExecute onIntent callback
  const swapIntent = useRef<SwapAndExecuteOnIntentHookData | null>(null);
  // swapWidgetIntent is set by useSwaps for the pure swap widget flow
  const swapWidgetIntent = useRef<OnSwapIntentHookData | null>(null);

  const cacheUsdRate = useCallback((tokenSymbol: string, usdRate: number) => {
    const normalized = normalizeTokenSymbol(tokenSymbol);
    const rate = toFinitePositiveNumber(usdRate);
    if (!normalized || !rate) return;

    coinbaseUsdRateCache.current[normalized] = rate;
    const currentRates = exchangeRate.current ?? {};
    if (currentRates[normalized] === rate) return;

    const nextRates = {
      ...currentRates,
      [normalized]: rate,
    };
    exchangeRate.current = nextRates;
    setExchangeRateState(nextRates);
  }, []);

  const getUsdRateFromLocalSources = useCallback((tokenSymbol: string) => {
    const normalizedSymbol = normalizeTokenSymbol(tokenSymbol);
    if (!normalizedSymbol) return 0;

    for (const candidate of getCoinbaseSymbolCandidates(normalizedSymbol)) {
      const sdkRate = toFinitePositiveNumber(exchangeRate.current?.[candidate]);
      if (sdkRate) return sdkRate;

      const cachedRate = toFinitePositiveNumber(
        coinbaseUsdRateCache.current[candidate],
      );
      if (cachedRate) return cachedRate;
    }

    if (usdPeggedSymbols.current.has(normalizedSymbol)) {
      return USD_PEGGED_FALLBACK_RATE;
    }

    return 0;
  }, []);

  const normalizeUserAssetFiatValues = useCallback(
    (assets: UserAssetDatum[] | null): UserAssetDatum[] | null => {
      if (!assets) return assets;

      return assets.map((asset) => {
        let computedAssetUsd = 0;

        const breakdown = (asset.breakdown ?? []).map((entry) => {
          const balance = Number.parseFloat(String(entry.balance ?? "0"));
          const safeBalance =
            Number.isFinite(balance) && balance > 0 ? balance : 0;
          const existingUsd = Number.parseFloat(
            String(entry.balanceInFiat ?? "0"),
          );
          const safeExistingUsd =
            Number.isFinite(existingUsd) && existingUsd >= 0 ? existingUsd : 0;

          let normalizedUsd = safeExistingUsd;
          if (safeBalance > 0 && normalizedUsd <= 0) {
            const rate = getUsdRateFromLocalSources(asset.symbol);
            if (rate > 0) {
              normalizedUsd = safeBalance * rate;
            }
          }

          computedAssetUsd += normalizedUsd;
          return {
            ...entry,
            balanceInFiat: normalizedUsd,
          };
        });

        const assetBalance = Number.parseFloat(String(asset.balance ?? "0"));
        const safeAssetBalance =
          Number.isFinite(assetBalance) && assetBalance > 0 ? assetBalance : 0;
        const rawAssetUsd = Number.parseFloat(
          String(asset.balanceInFiat ?? "0"),
        );
        const safeAssetUsd =
          Number.isFinite(rawAssetUsd) && rawAssetUsd >= 0 ? rawAssetUsd : 0;

        let normalizedAssetUsd = safeAssetUsd;
        if (normalizedAssetUsd <= 0) {
          if (computedAssetUsd > 0) {
            normalizedAssetUsd = computedAssetUsd;
          } else if (safeAssetBalance > 0) {
            const rate = getUsdRateFromLocalSources(asset.symbol);
            if (rate > 0) {
              normalizedAssetUsd = safeAssetBalance * rate;
            }
          }
        }

        return {
          ...asset,
          balanceInFiat: normalizedAssetUsd,
          breakdown,
        };
      });
    },
    [getUsdRateFromLocalSources],
  );

  const resolveTokenUsdRate = useCallback(
    async (tokenSymbol: string) => {
      const normalizedSymbol = normalizeTokenSymbol(tokenSymbol);
      if (!normalizedSymbol) return null;

      const sdkRate = toFinitePositiveNumber(
        exchangeRate.current?.[normalizedSymbol],
      );
      if (sdkRate) {
        return sdkRate;
      }

      const cachedRate = toFinitePositiveNumber(
        coinbaseUsdRateCache.current[normalizedSymbol],
      );
      if (cachedRate) {
        return cachedRate;
      }

      const inFlightRequest = coinbaseUsdRateRequests.current[normalizedSymbol];
      if (inFlightRequest) {
        return inFlightRequest;
      }

      const requestPromise = (async (): Promise<number | null> => {
        for (const candidate of getCoinbaseSymbolCandidates(normalizedSymbol)) {
          const sdkCandidateRate = toFinitePositiveNumber(
            exchangeRate.current?.[candidate],
          );
          if (sdkCandidateRate) {
            cacheUsdRate(normalizedSymbol, sdkCandidateRate);
            return sdkCandidateRate;
          }

          const cachedCandidateRate = toFinitePositiveNumber(
            coinbaseUsdRateCache.current[candidate],
          );
          if (cachedCandidateRate) {
            cacheUsdRate(normalizedSymbol, cachedCandidateRate);
            return cachedCandidateRate;
          }
        }

        const coinbaseRate = await fetchCoinbaseUsdRate(normalizedSymbol);
        if (coinbaseRate) {
          cacheUsdRate(normalizedSymbol, coinbaseRate);
          return coinbaseRate;
        }

        if (usdPeggedSymbols.current.has(normalizedSymbol)) {
          cacheUsdRate(normalizedSymbol, USD_PEGGED_FALLBACK_RATE);
          return USD_PEGGED_FALLBACK_RATE;
        }

        return null;
      })();

      coinbaseUsdRateRequests.current[normalizedSymbol] = requestPromise;
      try {
        return await requestPromise;
      } finally {
        delete coinbaseUsdRateRequests.current[normalizedSymbol];
      }
    },
    [cacheUsdRate],
  );

  const setupNexus = useCallback(async () => {
    // v2: getSupportedChains() is an instance method that uses configured network
    const list = client.getSupportedChains();
    supportedChainsAndTokens.current = list ?? null;
    usdPeggedSymbols.current = buildUsdPeggedSymbolSet(list ?? null);
    // v2: no separate getSwapSupportedChains — reuse getSupportedChains
    swapSupportedChainsAndTokens.current = list ?? null;

    // v2: getBalancesForBridge() is now async and returns array directly
    const [bridgeAbleBalanceResult] = await Promise.allSettled([
      client.getBalancesForBridge(),
    ]);

    if (bridgeAbleBalanceResult.status === "fulfilled") {
      setBridgableBalance(
        normalizeUserAssetFiatValues(bridgeAbleBalanceResult.value),
      );
    }
  }, [client, normalizeUserAssetFiatValues]);

  const initializeNexus = useCallback(
    async (provider: EthereumProvider) => {
      setLoading(true);
      try {
        // v2: two-step init — initialize() fetches deployment, setEVMProvider() connects wallet
        await client.initialize();
        await client.setEVMProvider(provider);
        setNexusClient(client);
      } catch (error) {
        console.error("Error initializing Nexus:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  const deinitializeNexus = useCallback(async () => {
    try {
      // v2: destroy() is synchronous
      client.destroy();
      setNexusClient(null);
      supportedChainsAndTokens.current = null;
      swapSupportedChainsAndTokens.current = null;
      setBridgableBalance(null);
      setSwapBalance(null);
      exchangeRate.current = null;
      setExchangeRateState(null);
      coinbaseUsdRateCache.current = {};
      coinbaseUsdRateRequests.current = {};
      usdPeggedSymbols.current = new Set(DEFAULT_USD_PEGGED_TOKEN_SYMBOLS);
      intent.current = null;
      swapIntent.current = null;
      allowance.current = null;
      setLoading(false);
    } catch (error) {
      console.error("Error deinitializing Nexus:", error);
    }
  }, [client]);

  // v2: hooks are now passed per-operation, not set globally.
  // attachEventHooks is kept for API compatibility but is a no-op.
  // Hooks (onIntent, onAllowance) are passed as options to bridge/transfer/swap calls.
  const attachEventHooks = useCallback(() => {
    // No-op in v2: hooks are passed per-operation via options.hooks
  }, []);

  const handleInit = useCallback(
    async (provider: EthereumProvider) => {
      if (nexusClient || loading) {
        return;
      }
      if (!provider || typeof provider.request !== "function") {
        throw new Error("Invalid EIP-1193 provider");
      }
      try {
        await initializeNexus(provider);
        await setupNexus();
        // attachEventHooks is a no-op in v2
      } catch (error) {
        console.error("Error during Nexus setup flow:", error);
        throw error;
      }
    },
    [nexusClient, loading, initializeNexus, setupNexus],
  );

  const fetchBridgableBalance = useCallback(async () => {
    try {
      // v2: returns array directly (no .assets wrapper)
      const updatedBalance = await client.getBalancesForBridge();
      setBridgableBalance(normalizeUserAssetFiatValues(updatedBalance));
    } catch (error) {
      console.error("Error fetching bridgable balance:", error);
    }
  }, [client, normalizeUserAssetFiatValues]);

  const fetchSwapBalance = useCallback(async () => {
    try {
      // v2: no filter param
      const updatedBalance = await client.getBalancesForSwap();
      setSwapBalance(normalizeUserAssetFiatValues(updatedBalance));
    } catch (error) {
      console.error("Error fetching swap balance:", error);
    }
  }, [client, normalizeUserAssetFiatValues]);

  const getFiatValue = useCallback(
    (amount: number, token: string) => {
      const rate = getUsdRateFromLocalSources(token);
      return rate * amount;
    },
    [getUsdRateFromLocalSources],
  );

  // Backfill USD values once rates arrive so downstream selectors/max logic
  // do not treat supported assets as $0 simply due to timing.
  useEffect(() => {
    if (!exchangeRateState) return;
    setSwapBalance((prev) => normalizeUserAssetFiatValues(prev));
    setBridgableBalance((prev) => normalizeUserAssetFiatValues(prev));
  }, [exchangeRateState, normalizeUserAssetFiatValues]);

  useAccountEffect({
    onDisconnect() {
      deinitializeNexus();
    },
  });

  const value = useMemo(
    () => ({
      nexusClient,
      nexusSDK: nexusClient, // backward-compat alias
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      intent,
      allowance,
      handleInit,
      supportedChainsAndTokens: supportedChainsAndTokens.current,
      swapSupportedChainsAndTokens: swapSupportedChainsAndTokens.current,
      bridgableBalance,
      swapBalance: swapBalance,
      network: config?.network,
      loading,
      fetchBridgableBalance,
      fetchSwapBalance,
      swapIntent,
      swapWidgetIntent,
      exchangeRate: exchangeRateState,
      getFiatValue,
      resolveTokenUsdRate,
    }),
    [
      nexusClient,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      handleInit,
      bridgableBalance,
      swapBalance,
      config,
      loading,
      fetchBridgableBalance,
      fetchSwapBalance,
      exchangeRateState,
      getFiatValue,
      resolveTokenUsdRate,
    ],
  );
  return (
    <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
  );
};

export function useNexus() {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error("useNexus must be used within a NexusProvider");
  }
  return context;
}

export default NexusProvider;
