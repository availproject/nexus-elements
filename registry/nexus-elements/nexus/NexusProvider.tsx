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
  swapIntent: Parameters<OnSwapIntentHook>[0] | null;
  setSwapIntent: React.Dispatch<
    React.SetStateAction<Parameters<OnSwapIntentHook>[0] | null>
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
  const [loading, setLoading] = useState<boolean>(false);
  const [intent, setIntent] = useState<OnIntentHookData | null>(null);
  const [swapIntent, setSwapIntent] = useState<
    Parameters<OnSwapIntentHook>[0] | null
  >(null);
  const [allowance, setAllowance] = useState<OnAllowanceHookData | null>(null);

  useMemo(() => {
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
      console.log("Nexus initialized with Provider:", provider);
      setNexusSDK(sdk);
      const unifiedBalance = await sdk?.getUnifiedBalances(true);
      console.log("unifiedBalance", unifiedBalance);
      setUnifiedBalance(unifiedBalance);
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

    sdk.setOnSwapIntentHook((data: Parameters<OnSwapIntentHook>[0]) => {
      console.log("swapIntent", data);
      setSwapIntent(data);
    });
  };

  const handleInit = useCallback(
    async (provider: EthereumProvider) => {
      if (sdk.isInitialized()) {
        console.log("Nexus already initialized");
        return;
      }
      await initializeNexus(provider);
      attachEventHooks();
    },
    [sdk]
  );

  const fetchUnifiedBalance = async () => {
    try {
      const unifiedBalance = await sdk?.getUnifiedBalances(true);
      setUnifiedBalance(unifiedBalance);
    } catch (error) {
      console.error("Error fetching unified balance:", error);
    }
  };

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
