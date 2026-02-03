"use client";
import { type FC, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "../ui/card";
import ChainSelect from "./components/chain-select";
import TokenSelect from "./components/token-select";
import { Button } from "../ui/button";
import { LoaderPinwheel, X } from "lucide-react";
import { useNexus } from "../nexus/NexusProvider";
import AmountInput from "./components/amount-input";
import FeeBreakdown from "./components/fee-breakdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import TransactionProgress from "./components/transaction-progress";
import AllowanceModal from "./components/allowance-modal";
import useBridge from "./hooks/useBridge";
import SourceBreakdown from "./components/source-breakdown";
import {
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import { type Address, isAddress } from "viem";
import { Skeleton } from "../ui/skeleton";
import RecipientAddress from "./components/recipient-address";
import ViewHistory from "../view-history/view-history";
interface FastBridgeMockIntent {
  totalAmount?: string;
  receiveAmount?: string;
  totalGas?: string;
}

interface FastBridgeProps {
  connectedAddress?: Address;
  isWalletConnected?: boolean;
  onConnectWallet?: () => void;
  mockIntent?: FastBridgeMockIntent;
  prefill?: {
    token: SUPPORTED_TOKENS;
    chainId: SUPPORTED_CHAINS_IDS;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: () => void;
  onStart?: () => void;
  onError?: (message: string) => void;
}

const FastBridge: FC<FastBridgeProps> = ({
  connectedAddress,
  isWalletConnected,
  onConnectWallet,
  mockIntent,
  onComplete,
  onStart,
  onError,
  prefill,
}) => {
  const {
    nexusSDK,
    intent,
    bridgableBalance,
    allowance,
    network,
    fetchBridgableBalance,
    supportedChainsAndTokens,
  } = useNexus();

  const {
    inputs,
    setInputs,
    timer,
    loading,
    refreshing,
    isDialogOpen,
    txError,
    setTxError,
    handleTransaction,
    reset,
    filteredBridgableBalance,
    startTransaction,
    setIsDialogOpen,
    commitAmount,
    lastExplorerUrl,
    steps,
    status,
  } = useBridge({
    prefill,
    network: network ?? "mainnet",
    connectedAddress,
    nexusSDK,
    intent,
    bridgableBalance,
    allowance,
    onComplete,
    onStart,
    onError,
    fetchBalance: fetchBridgableBalance,
  });

  const isConnected =
    typeof isWalletConnected === "boolean"
      ? isWalletConnected
      : Boolean(connectedAddress);
  const canUseSdk = isConnected && Boolean(nexusSDK);

  const selectedChainMeta = useMemo(() => {
    return supportedChainsAndTokens?.find((chain) => chain.id === inputs?.chain);
  }, [supportedChainsAndTokens, inputs?.chain]);

  const hasValidInputs = useMemo(() => {
    const hasToken = inputs?.token !== undefined && inputs?.token !== null;
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    const hasValidRecipient =
      Boolean(inputs?.recipient) && isAddress(inputs?.recipient as string);
    return hasToken && hasChain && hasAmount && hasValidRecipient;
  }, [inputs]);

  const autoIntentTriggeredRef = useRef(false);

  useEffect(() => {
    if (isConnected && connectedAddress && !inputs?.recipient) {
      setInputs({ ...inputs, recipient: connectedAddress });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, connectedAddress, inputs?.recipient]);

  useEffect(() => {
    if (!canUseSdk) {
      autoIntentTriggeredRef.current = false;
      return;
    }
    if (!hasValidInputs || loading || refreshing || intent.current) return;
    if (autoIntentTriggeredRef.current) return;
    autoIntentTriggeredRef.current = true;
    void handleTransaction();
  }, [
    canUseSdk,
    hasValidInputs,
    loading,
    refreshing,
    handleTransaction,
    intent,
  ]);

  useEffect(() => {
    autoIntentTriggeredRef.current = false;
  }, [inputs?.amount, inputs?.chain, inputs?.token, inputs?.recipient, canUseSdk]);

  const tokenSuffix = inputs?.token ? ` ${inputs.token}` : "";
  const numericAmount = Number(inputs?.amount);
  const canComputeMock =
    Number.isFinite(numericAmount) && numericAmount > 0 && !mockIntent;
  const mockFeeBps = 10;
  const mockFeeRate = mockFeeBps / 10_000;
  const computedGas = canComputeMock ? numericAmount * mockFeeRate : 0;
  const computedReceive = canComputeMock ? numericAmount : 0;
  const computedSpend = canComputeMock ? numericAmount + computedGas : 0;
  const mockDecimals = numericAmount >= 1 ? 2 : 4;
  const formatMockAmount = (value: number) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: mockDecimals,
      maximumFractionDigits: mockDecimals,
    });
  const mockSpend = mockIntent?.totalAmount
    ? mockIntent.totalAmount
    : canComputeMock
      ? formatMockAmount(computedSpend)
      : "—";
  const mockReceive = mockIntent?.receiveAmount
    ? mockIntent.receiveAmount
    : canComputeMock
      ? formatMockAmount(computedReceive)
      : "—";
  const mockGas = mockIntent?.totalGas
    ? mockIntent.totalGas
    : canComputeMock
      ? `${formatMockAmount(computedGas)}${tokenSuffix}`
      : "—";

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-y-4 w-full px-2 sm:px-6 relative">
        {canUseSdk && <ViewHistory className="absolute -top-2 right-3" />}
        <ChainSelect
          selectedChain={inputs?.chain}
          handleSelect={(chain) =>
            setInputs({
              ...inputs,
              chain,
            })
          }
          label="To"
          disabled={!!prefill?.chainId}
        />
        <TokenSelect
          selectedChain={inputs?.chain}
          selectedToken={inputs?.token}
          handleTokenSelect={(token) => setInputs({ ...inputs, token })}
          disabled={!!prefill?.token}
        />
        <AmountInput
          amount={inputs?.amount}
          onChange={(amount) => setInputs({ ...inputs, amount })}
          bridgableBalance={filteredBridgableBalance}
          onCommit={canUseSdk ? () => void commitAmount() : undefined}
          disabled={refreshing || !!prefill?.amount}
          inputs={inputs}
          showBalance={canUseSdk}
        />
        <RecipientAddress
          address={inputs?.recipient}
          onChange={(address) =>
            setInputs({ ...inputs, recipient: address as `0x${string}` })
          }
          disabled={!!prefill?.recipient}
        />

        {!isConnected &&
          Number.isFinite(Number(inputs?.amount)) &&
          Number(inputs?.amount) > 0 && (
          <>
            <div className="w-full flex items-start justify-between gap-x-4">
              <p className="text-base font-light">You spend</p>
              <p className="text-base font-light text-right">
                {mockSpend}
                {tokenSuffix}
              </p>
            </div>
            <div className="w-full flex items-start justify-between gap-x-4">
              <p className="text-base font-light">You receive</p>
              <div className="flex flex-col gap-y-1 min-w-fit">
                <p className="text-base font-light text-right">
                  {mockReceive}
                  {tokenSuffix}
                </p>
                {selectedChainMeta?.name && (
                  <p className="text-sm font-light text-right">
                    on {selectedChainMeta?.name}
                  </p>
                )}
              </div>
            </div>
            <div className="w-full flex items-start justify-between gap-x-4">
              <p className="text-base font-light">Total gas</p>
              <p className="text-base font-light text-right">{mockGas}</p>
            </div>
          </>
        )}

        {canUseSdk && intent?.current?.intent && (
          <>
            <SourceBreakdown
              intent={intent?.current?.intent}
              tokenSymbol={filteredBridgableBalance?.symbol as SUPPORTED_TOKENS}
              isLoading={refreshing}
            />

            <div className="w-full flex items-start justify-between gap-x-4">
              <p className="text-base font-light">You receive</p>
              <div className="flex flex-col gap-y-1 min-w-fit">
                {refreshing ? (
                  <Skeleton className="h-5 w-28" />
                ) : (
                  <p className="text-base font-light text-right">
                    {`${
                      connectedAddress === inputs?.recipient
                        ? intent?.current?.intent?.destination?.amount
                        : inputs.amount
                    } ${filteredBridgableBalance?.symbol}`}
                  </p>
                )}
                {refreshing ? (
                  <Skeleton className="h-4 w-36" />
                ) : (
                  <p className="text-sm font-light text-right">
                    on {intent?.current?.intent?.destination?.chainName}
                  </p>
                )}
              </div>
            </div>
            <FeeBreakdown
              intent={intent?.current?.intent}
              isLoading={refreshing}
            />
          </>
        )}

        {!intent.current && (
          <Button
            onClick={() => {
              if (!isConnected) {
                onConnectWallet?.();
              }
            }}
            disabled={!isConnected ? !onConnectWallet : true}
          >
            {!isConnected ? (
              "Connect Wallet"
            ) : !canUseSdk ? (
              "Initializing..."
            ) : !hasValidInputs ? (
              "Complete form"
            ) : loading ? (
              <span className="flex items-center gap-x-2">
                <LoaderPinwheel className="animate-spin size-5" />
                Fetching intent...
              </span>
            ) : (
              "Fetching intent..."
            )}
          </Button>
        )}

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (loading) return;
            setIsDialogOpen(open);
          }}
        >
          {intent.current && !isDialogOpen && (
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
            <DialogHeader className="sr-only">
              <DialogTitle>Transaction Progress</DialogTitle>
            </DialogHeader>
            {allowance.current ? (
              <AllowanceModal
                allowance={allowance}
                callback={startTransaction}
                onCloseCallback={reset}
              />
            ) : (
              <TransactionProgress
                timer={timer}
                steps={steps}
                viewIntentUrl={lastExplorerUrl}
                operationType={"bridge"}
                completed={status === "success"}
              />
            )}
          </DialogContent>
        </Dialog>

        {txError && (
          <div className="rounded-md border border-destructive bg-destructive/80 px-3 py-2 text-sm text-destructive-foreground flex items-start justify-between gap-x-3 mt-3 w-full max-w-md">
            <span className="flex-1 w-full truncate">{txError}</span>
            <Button
              type="button"
              size={"icon"}
              variant={"ghost"}
              onClick={() => {
                reset();
                setTxError(null);
              }}
              className="text-destructive-foreground/80 hover:text-destructive-foreground focus:outline-none"
              aria-label="Dismiss error"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FastBridge;
