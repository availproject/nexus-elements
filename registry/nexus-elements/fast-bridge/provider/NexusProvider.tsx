"use client";
import {
  EthereumProvider,
  NexusSDK,
  OnAllowanceHookData,
  OnIntentHookData,
  UserAsset,
} from "@avail-project/nexus";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { NexusContextType, SupportedChainsAndTokens } from "../types";

const NexusContext = createContext<NexusContextType | undefined>(undefined);
const NexusProvider = ({ children }: { children: React.ReactNode }) => {
  const sdk = useMemo(
    () =>
      new NexusSDK({
        network: "mainnet",
        debug: true,
      }),
    [],
  );
  const [nexusSDK, setNexusSDK] = useState<NexusSDK | null>(null);
  const [supportedChainsAndTokens, setSupportedChainsAndTokens] =
    useState<SupportedChainsAndTokens | null>(null);
  const [unifiedBalance, setUnifiedBalance] = useState<UserAsset[] | null>(
    null,
  );
  const [intent, setIntent] = useState<OnIntentHookData | null>(null);
  const [allowance, setAllowance] = useState<OnAllowanceHookData | null>(null);

  const initializeNexus = async (provider: EthereumProvider) => {
    try {
      if (sdk.isInitialized()) throw new Error("Nexus is already initialized");
      await sdk.initialize(provider);
      setNexusSDK(sdk);
      const unifiedBalance = await sdk?.getUnifiedBalances();
      setUnifiedBalance(unifiedBalance);
      const supportedChainsAndTokens =
        sdk?.utils?.getSupportedChains() as SupportedChainsAndTokens;
      setSupportedChainsAndTokens(supportedChainsAndTokens);
    } catch (error) {
      console.error("Error initializing Nexus:", error);
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
      // const { sources, allow, deny } = data;
      // This is a hook for the dev to show user the allowances that need to be setup for the current tx to happen
      // where,
      // sources: an array of objects with minAllowance, chainID, token symbol, etc.
      // allow(allowances): continues the transaction flow with the specified allowances; `allowances` is an array with the chosen allowance for each of the requirements (allowances.length === sources.length), either 'min', 'max', a bigint or a string
      // deny(): stops the flow
      setAllowance(data);
    });

    sdk.setOnIntentHook((data) => {
      // const { intent, allow, deny, refresh } = data;
      // This is a hook for the dev to show user the intent, the sources and associated fees
      // where,
      // intent: Intent data containing sources and fees for display purpose
      // allow(): accept the current intent and continue the flow
      // deny(): deny the intent and stop the flow
      // refresh(): should be on a timer of 5s to refresh the intent (old intents might fail due to fee changes if not refreshed)
      setIntent(data);
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
    [sdk, attachEventHooks, initializeNexus],
  );

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
      unifiedBalance,
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
      unifiedBalance,
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
