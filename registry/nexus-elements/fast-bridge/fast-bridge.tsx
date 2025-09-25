"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "../ui/card";
import ChainSelect from "./components/chain-select";
import TokenSelect from "./components/token-select";
import { SUPPORTED_CHAINS } from "@avail-project/nexus";
import { Button } from "../ui/button";
import { LoaderPinwheel } from "lucide-react";
import { useNexus } from "./provider/NexusProvider";
import ReceipientAddress from "./components/receipient-address";
import AmountInput from "./components/amount-input";
import FeeBreakdown from "./components/fee-breakdown";
import { FastBridgeProps, FastBridgeState } from "./types";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import TransactionProgress from "./components/transaction-progress";
import AllowanceModal from "./components/allowance-modal";
import useListenTransaction from "./hooks/useListenTransaction";

const FastBridge: React.FC<FastBridgeProps> = ({ connectedAddress }) => {
  const [inputs, setInputs] = useState<FastBridgeState>({
    chain: SUPPORTED_CHAINS.ETHEREUM,
    token: "USDC",
    amount: undefined,
    recipient: connectedAddress,
  });
  const [timer, setTimer] = useState(0);
  const [startTxn, setStartTxn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {
    nexusSDK,
    intent,
    setIntent,
    unifiedBalance,
    allowance,
    setAllowance,
  } = useNexus();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { processing, latestCompletedIndex, explorerUrl } =
    useListenTransaction(nexusSDK);

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
            transferTxn?.explorerUrl
          );
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
      }
    } catch (error) {
      console.error("Transaction failed:", error);
      setTxError((error as Error)?.message || "Transaction failed");
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
      setStartTxn(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIntent(null);
    }
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
    setInputs({
      chain: SUPPORTED_CHAINS.ETHEREUM,
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
    let interval: any;
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

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-y-4 w-full">
        <ChainSelect
          selectedChain={inputs?.chain}
          handleSelect={(chain) =>
            setInputs({
              ...inputs,
              chain,
            })
          }
        />
        <TokenSelect
          selectedChain={inputs?.chain}
          selectedToken={inputs?.token}
          handleTokenSelect={(token) => setInputs({ ...inputs, token })}
        />
        <AmountInput
          amount={inputs?.amount}
          onChange={(amount) => setInputs({ ...inputs, amount })}
          unifiedBalance={filteredUnifiedBalance}
          sources={intent?.intent?.sources}
        />
        <ReceipientAddress
          address={inputs?.recipient}
          onChange={(address) =>
            setInputs({ ...inputs, recipient: address as `0x${string}` })
          }
        />
        {intent?.intent && <FeeBreakdown intent={intent?.intent} />}
        {!intent && (
          <Button
            onClick={handleTransaction}
            disabled={
              !inputs?.amount ||
              !inputs?.recipient ||
              !inputs?.chain ||
              !inputs?.token ||
              loading
            }
          >
            {loading ? (
              <LoaderPinwheel className="animate-spin size-5" />
            ) : (
              "Bridge"
            )}
          </Button>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {intent && (
            <div className="w-full flex items-center gap-x-2 justify-between">
              <Button variant={"destructive"} onClick={reset} className="w-1/2">
                Deny
              </Button>
              <DialogTrigger asChild>
                <Button
                  onClick={startTransaction}
                  className="w-1/2"
                  disabled={refreshing}
                >
                  {refreshing ? "Refreshing..." : "Accept"}
                </Button>
              </DialogTrigger>
            </div>
          )}
          <DialogContent>
            <TransactionProgress
              timer={timer}
              steps={processing}
              latestCompletedIndex={latestCompletedIndex}
              viewIntentUrl={explorerUrl}
              operationType={"bridge"}
            />
          </DialogContent>
        </Dialog>
        {allowance && (
          <AllowanceModal
            allowanceModal={allowance}
            setAllowanceModal={setAllowance}
            callback={startTransaction}
          />
        )}

        {txError && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start justify-between gap-x-3">
            <span className="flex-1">{txError}</span>
            <Button
              type="button"
              size={"icon"}
              variant={"ghost"}
              onClick={() => setTxError(null)}
              className="text-red-700/80 hover:text-red-900 focus:outline-none"
              aria-label="Dismiss error"
            >
              ×
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FastBridge;
