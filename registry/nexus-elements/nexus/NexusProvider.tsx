"use client";
import {
  type EthereumProvider,
  type NexusNetwork,
  NexusSDK,
  type OnAllowanceHookData,
  type OnIntentHookData,
  type OnSwapIntentHook,
  type SupportedChainsResult,
  type UserAsset,
  type OnSwapIntentHookData,
  NexusError,
  ERROR_CODES,
} from "@avail-project/nexus-core";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface NexusContextType {
  nexusSDK: NexusSDK | null;
  unifiedBalance: UserAsset[] | null;
  initializeNexus: (provider: EthereumProvider) => Promise<void>;
  deinitializeNexus: () => Promise<void>;
  attachEventHooks: () => void;
  intent: OnIntentHookData | null;
  exchangeRate: Record<string, number> | null;
  swapIntent: OnSwapIntentHookData | null;
  setSwapIntent: React.Dispatch<
    React.SetStateAction<OnSwapIntentHookData | null>
  >;
  setIntent: React.Dispatch<React.SetStateAction<OnIntentHookData | null>>;
  allowance: OnAllowanceHookData | null;
  setAllowance: React.Dispatch<
    React.SetStateAction<OnAllowanceHookData | null>
  >;
  handleInit: (provider: EthereumProvider) => Promise<void>;
  supportedChainsAndTokens: SupportedChainsResult | null;
  swapSupportedChainsAndTokens: SupportedChainsResult | null;
  network?: NexusNetwork;
  loading: boolean;
  fetchUnifiedBalance: () => Promise<void>;
  handleNexusError: (err: unknown) => {
    code?: (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
    message: string;
    context?: string;
    details?: Record<string, unknown>;
  };
  getFiatValue: (amount: number, token: string) => string;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);
const NexusProvider = ({
  children,
  config = {
    network: "mainnet",
    debug: true,
  },
}: {
  children: React.ReactNode;
  config?: {
    network?: NexusNetwork;
    debug?: boolean;
  };
}) => {
  const sdk = useMemo(() => new NexusSDK(config), [config]);
  const [nexusSDK, setNexusSDK] = useState<NexusSDK | null>(null);
  const [supportedChainsAndTokens, setSupportedChainsAndTokens] =
    useState<SupportedChainsResult | null>(null);
  const [swapSupportedChainsAndTokens, setSwapSupportedChainsAndTokens] =
    useState<SupportedChainsResult | null>(null);
  const [unifiedBalance, setUnifiedBalance] = useState<UserAsset[] | null>(
    null
  );
  const [exchangeRate, setExchangeRate] = useState<Record<
    string,
    number
  > | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [intent, setIntent] = useState<OnIntentHookData | null>(null);
  const [swapIntent, setSwapIntent] = useState<
    Parameters<OnSwapIntentHook>[0] | null
  >(null);
  const [allowance, setAllowance] = useState<OnAllowanceHookData | null>(null);

  const initChainsAndTokens = useCallback(() => {
    const list = sdk?.utils?.getSupportedChains(
      config?.network === "testnet" ? 0 : undefined
    );
    setSupportedChainsAndTokens(list ?? null);
    const swapList = sdk?.utils?.getSwapSupportedChainsAndTokens();
    setSwapSupportedChainsAndTokens(swapList ?? null);
  }, [sdk, config?.network]);

  const initializeNexus = async (provider: EthereumProvider) => {
    setLoading(true);
    try {
      if (sdk.isInitialized()) throw new Error("Nexus is already initialized");
      await sdk.initialize(provider);
      setNexusSDK(sdk);
      const unifiedBalance = await sdk?.getUnifiedBalances(true);
      setUnifiedBalance(unifiedBalance);
      // Coinbase returns "units per USD" (e.g., 1 USD = 0.00028 ETH).
      // Convert to "USD per unit" (e.g., 1 ETH = ~$3514) for straightforward UI calculations.
      const rates = await sdk?.utils?.getCoinbaseRates();
      const usdPerUnit: Record<string, number> = {};

      for (const [symbol, value] of Object.entries(rates ?? {})) {
        const unitsPerUsd = Number.parseFloat(String(value));
        if (Number.isFinite(unitsPerUsd) && unitsPerUsd > 0) {
          usdPerUnit[symbol.toUpperCase()] = 1 / unitsPerUsd;
        }
      }

      for (const token of ["ETH", "USDC", "USDT"]) {
        usdPerUnit[token] ??= 1;
      }
      setExchangeRate(usdPerUnit);
      initChainsAndTokens();
    } catch (error) {
      console.error("Error initializing Nexus:", error);
    } finally {
      setLoading(false);
    }
  };

  const deinitializeNexus = async () => {
    try {
      if (!sdk.isInitialized()) throw new Error("Nexus is not initialized");
      await sdk.deinit();
      setNexusSDK(null);
      setSupportedChainsAndTokens(null);
      setSwapSupportedChainsAndTokens(null);
      setUnifiedBalance(null);
      setExchangeRate(null);
      setIntent(null);
      setSwapIntent(null);
      setAllowance(null);
      setLoading(false);
    } catch (error) {
      console.error("Error deinitializing Nexus:", error);
    }
  };

  const attachEventHooks = () => {
    sdk.setOnAllowanceHook((data: OnAllowanceHookData) => {
      setAllowance(data);
    });

    sdk.setOnIntentHook((data: OnIntentHookData) => {
      setIntent(data);
    });

    sdk.setOnSwapIntentHook((data: OnSwapIntentHookData) => {
      setSwapIntent(data);
    });
  };

  const handleInit = useCallback(
    async (provider: EthereumProvider) => {
      if (loading) {
        return;
      }
      if (sdk.isInitialized()) {
        console.log("Nexus already initialized");
        return;
      }
      if (!provider || typeof (provider as any).request !== "function") {
        throw new Error("Invalid EIP-1193 provider");
      }
      await initializeNexus(provider);
      attachEventHooks();
    },
    [sdk, loading, initializeNexus]
  );

  const fetchUnifiedBalance = async () => {
    try {
      const unifiedBalance = await sdk?.getUnifiedBalances(true);
      setUnifiedBalance(unifiedBalance);
    } catch (error) {
      console.error("Error fetching unified balance:", error);
    }
  };

  function getFiatValue(amount: number, token: string) {
    const key = token.toUpperCase();
    const rate = Number.parseFloat(String(exchangeRate?.[key] ?? "0"));
    const isValid = Number.isFinite(amount) && Number.isFinite(rate);
    const approx = isValid ? rate * amount : 0;

    return approx.toFixed(3);
  }

  const handleNexusError: NexusContextType["handleNexusError"] = (err) => {
    if (err instanceof NexusError) {
      const { code, message, data } = err;
      return {
        code,
        message,
        context: data?.context,
        details: data?.details ?? undefined,
      };
    }
    return { message: (err as Error)?.message || "Unexpected error" };
  };

  const value = useMemo(
    () => ({
      nexusSDK,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      intent,
      setIntent,
      allowance,
      setAllowance,
      handleInit,
      supportedChainsAndTokens,
      swapSupportedChainsAndTokens,
      unifiedBalance,
      network: config?.network,
      loading,
      fetchUnifiedBalance,
      swapIntent,
      setSwapIntent,
      handleNexusError,
      exchangeRate,
      getFiatValue,
    }),
    [
      nexusSDK,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      intent,
      setIntent,
      allowance,
      setAllowance,
      handleInit,
      supportedChainsAndTokens,
      swapSupportedChainsAndTokens,
      unifiedBalance,
      config,
      loading,
      fetchUnifiedBalance,
      swapIntent,
      setSwapIntent,
      handleNexusError,
      exchangeRate,
      getFiatValue,
    ]
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
