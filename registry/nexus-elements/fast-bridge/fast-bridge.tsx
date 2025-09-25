"use client";
import React, { useEffect, useMemo, useState } from "react";
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

const FastBridge: React.FC<FastBridgeProps> = ({ connectedAddress }) => {
  const [inputs, setInputs] = useState<FastBridgeState>({
    chain: SUPPORTED_CHAINS.ETHEREUM,
    token: "USDC",
    amount: undefined,
    recipient: connectedAddress,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { nexusSDK, intent, setIntent, unifiedBalance } = useNexus();

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
    try {
      if (inputs?.recipient !== connectedAddress) {
        // Transfer
        const transferTxn = await nexusSDK?.transfer({
          token: inputs?.token,
          amount: inputs?.amount,
          chainId: inputs?.chain,
          recipient: inputs?.recipient,
        });
        if (transferTxn?.success) {
          console.log("Transfer transaction successful");
          console.log(
            "Transfer transaction explorer",
            transferTxn?.explorerUrl,
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
      if (bridgeTxn?.success) {
        console.log("Bridge transaction successful");
        console.log("Bridge transaction explorer", bridgeTxn?.explorerUrl);
      }
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setLoading(false);
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
        {intent && (
          <div className="w-full flex items-center gap-x-2 justify-between">
            <Button variant={"destructive"} onClick={reset} className="w-1/2">
              Deny
            </Button>
            <Button
              onClick={intent?.allow}
              className="w-1/2"
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Accept"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FastBridge;
