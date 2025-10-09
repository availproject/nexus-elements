import {
  NexusNetwork,
  NexusSDK,
  OnAllowanceHookData,
  OnIntentHookData,
  SUPPORTED_CHAINS,
  UserAsset,
} from "@avail-project/nexus-core";
import { FastBridgeState } from "../types";
import { useEffect, useMemo, useRef, useState } from "react";
import { Address, isAddress } from "viem";
import { useNexus } from "../../nexus/NexusProvider";

interface UseBridgeProps {
  network: NexusNetwork;
  connectedAddress: Address;
  nexusSDK: NexusSDK | null;
  intent: OnIntentHookData | null;
  setIntent: React.Dispatch<React.SetStateAction<OnIntentHookData | null>>;
  setAllowance: React.Dispatch<
    React.SetStateAction<OnAllowanceHookData | null>
  >;
  unifiedBalance: UserAsset[] | null;
}

const useBridge = ({
  network,
  connectedAddress,
  nexusSDK,
  intent,
  setIntent,
  setAllowance,
  unifiedBalance,
}: UseBridgeProps) => {
  const { fetchUnifiedBalance } = useNexus();
  const [inputs, setInputs] = useState<FastBridgeState>({
    chain:
      network === "testnet"
        ? SUPPORTED_CHAINS.SEPOLIA
        : SUPPORTED_CHAINS.ETHEREUM,
    token: "USDC",
    amount: undefined,
    recipient: connectedAddress,
  });

  const [timer, setTimer] = useState(0);
  const [startTxn, setStartTxn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const areInputsValid = useMemo(() => {
    const hasToken = inputs?.token !== undefined && inputs?.token !== null;
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    const hasValidRecipient =
      Boolean(inputs?.recipient) && isAddress(inputs?.recipient as string);
    return hasToken && hasChain && hasAmount && hasValidRecipient;
  }, [inputs]);

  const handleTransaction = async () => {
    if (
      !inputs?.amount ||
      !inputs?.recipient ||
      !inputs?.chain ||
      !inputs?.token
    ) {
      console.error("Missing required inputs");
      return;
    }
    setLoading(true);
    setTxError(null);
    try {
      if (inputs?.recipient !== connectedAddress) {
        // Transfer
        const transferTxn = await nexusSDK?.transfer({
          token: inputs?.token,
          amount: inputs?.amount,
          chainId: inputs?.chain,
          recipient: inputs?.recipient,
        });
        if (!transferTxn?.success) {
          throw new Error(transferTxn?.error || "Transaction rejected by user");
        }
        if (transferTxn?.success) {
          console.log("Transfer transaction successful");
          console.log(
            "Transfer transaction explorer",
            transferTxn?.explorerUrl,
          );
          await onSuccess();
        }
        return;
      }
      // Bridge
      const bridgeTxn = await nexusSDK?.bridge({
        token: inputs?.token,
        amount: inputs?.amount,
        chainId: inputs?.chain,
      });
      if (!bridgeTxn?.success) {
        throw new Error(bridgeTxn?.error || "Transaction rejected by user");
      }
      if (bridgeTxn?.success) {
        console.log("Bridge transaction successful");
        console.log("Bridge transaction explorer", bridgeTxn?.explorerUrl);
        await onSuccess();
      }
    } catch (error) {
      console.error("Transaction failed:", (error as Error)?.message);
      if (!(error as Error)?.message?.includes("User rejected the request")) {
        setTxError((error as Error)?.message || "Transaction failed");
      }
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
      setStartTxn(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const onSuccess = async () => {
    setIntent(null);
    setAllowance(null);
    setInputs({
      chain:
        network === "testnet"
          ? SUPPORTED_CHAINS.SEPOLIA
          : SUPPORTED_CHAINS.ETHEREUM,
      token: "USDC",
      amount: undefined,
      recipient: connectedAddress,
    });
    setRefreshing(false);
    await fetchUnifiedBalance();
  };

  const filteredUnifiedBalance = useMemo(() => {
    return unifiedBalance?.filter((bal) => bal?.symbol === inputs?.token)[0];
  }, [unifiedBalance, inputs?.token]);

  const refreshIntent = async () => {
    setRefreshing(true);
    try {
      await intent?.refresh([]);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const reset = () => {
    intent?.deny();
    setIntent(null);
    setAllowance(null);
    setInputs({
      chain:
        network === "testnet"
          ? SUPPORTED_CHAINS.SEPOLIA
          : SUPPORTED_CHAINS.ETHEREUM,
      token: "USDC",
      amount: undefined,
      recipient: connectedAddress,
    });
    setLoading(false);
    setStartTxn(false);
    setRefreshing(false);
  };

  const startTransaction = () => {
    setStartTxn(true);
    intent?.allow();
    setIsDialogOpen(true);
    setTxError(null);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (intent) {
      interval = setInterval(refreshIntent, 5000);
    }
    return () => {
      clearInterval(interval);
    };
  }, [intent]);

  useEffect(() => {
    if (startTxn) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 0.1);
      }, 100);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [startTxn]);

  useEffect(() => {
    if (intent) {
      intent.deny();
      setIntent(null);
    }
  }, [inputs]);

  useEffect(() => {
    if (intent || loading || !areInputsValid || txError) return;
    const timeout = setTimeout(() => {
      void handleTransaction();
    }, 700);
    return () => clearTimeout(timeout);
  }, [areInputsValid, intent, loading, txError]);

  return {
    inputs,
    setInputs,
    timer,
    setIsDialogOpen,
    setTxError,
    loading,
    refreshing,
    isDialogOpen,
    txError,
    handleTransaction,
    reset,
    filteredUnifiedBalance,
    startTransaction,
  };
};

export default useBridge;
