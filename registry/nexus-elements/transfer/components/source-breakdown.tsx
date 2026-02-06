import {
  type ReadableIntent,
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
  type UserAsset,
} from "@avail-project/nexus-core";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { Skeleton } from "../../ui/skeleton";
import { useMemo } from "react";
import { useNexus } from "../../nexus/NexusProvider";
import { Checkbox } from "../../ui/checkbox";
import { cn } from "@/lib/utils";

interface SourceBreakdownProps {
  intent?: ReadableIntent;
  tokenSymbol: SUPPORTED_TOKENS;
  isLoading?: boolean;
  chain?: SUPPORTED_CHAINS_IDS;
  bridgableBalance?: UserAsset;
  requiredAmount?: string;
  availableSources: UserAsset["breakdown"];
  selectedSourceChains: number[];
  onToggleSourceChain: (chainId: number) => void;
  isSourceSelectionInsufficient?: boolean;
  selectedTotal?: string;
  requiredTotal?: string;
}

const SourceBreakdown = ({
  intent,
  tokenSymbol,
  isLoading = false,
  chain,
  bridgableBalance,
  requiredAmount,
  availableSources,
  selectedSourceChains,
  onToggleSourceChain,
  isSourceSelectionInsufficient = false,
  selectedTotal,
  requiredTotal,
}: SourceBreakdownProps) => {
  const { nexusSDK } = useNexus();

  const fundsOnDestination = useMemo(() => {
    if (!bridgableBalance || !chain) return 0;
    return Number.parseFloat(
      bridgableBalance?.breakdown?.find((b) => b.chain?.id === chain)
        ?.balance ?? "0",
    );
  }, [bridgableBalance, chain]);

  const spendOnSources = useMemo(() => {
    if (!intent || (intent?.sources?.length ?? 0) < 2)
      return `1 asset on 1 chain`;
    return `${intent?.sources?.length} Assets on ${intent?.sources?.length} chains`;
  }, [intent]);

  const amountSpend = useMemo(() => {
    const base = Number(requiredAmount ?? "0");
    if (!intent) return base;
    const fees = Number.parseFloat(intent?.fees?.total ?? "0");
    return base + fees;
  }, [requiredAmount, intent]);

  const directDestinationSpend = useMemo(() => {
    if (!chain) return 0;
    if (!selectedSourceChains.includes(chain)) return 0;
    const requiredAmountNumber = Number(requiredAmount ?? "0");
    if (!Number.isFinite(requiredAmountNumber) || requiredAmountNumber <= 0) {
      return 0;
    }
    const destUsed = Math.max(
      Math.min(requiredAmountNumber, fundsOnDestination),
      0,
    );
    return destUsed;
  }, [chain, requiredAmount, fundsOnDestination, selectedSourceChains]);

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="sources">
        <div className="flex items-start justify-between gap-x-4 w-full">
          {isLoading ? (
            <>
              <div className="flex flex-col items-start gap-y-1 min-w-fit">
                <p className="text-base font-light">You Spend</p>
                <Skeleton className="h-4 w-44" />
              </div>
              <div className="flex flex-col items-end gap-y-1 min-w-fit">
                <Skeleton className="h-5 w-24" />
                <div className="w-fit">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </>
          ) : (
            intent && (
              <>
                <div className="flex flex-col items-start gap-y-1 min-w-fit">
                  <p className="text-base font-light">You Spend</p>
                  <p className="text-sm font-light">{spendOnSources}</p>
                </div>

                <div className="flex flex-col items-end gap-y-1 min-w-fit">
                  <p className="text-base font-light">
                    {nexusSDK?.utils?.formatTokenBalance(amountSpend, {
                      symbol: tokenSymbol,
                      decimals: intent?.token?.decimals,
                    })}
                  </p>

                  <AccordionTrigger
                    containerClassName="w-fit"
                    className="py-0 items-center gap-x-1"
                    hideChevron={false}
                  >
                    <p className="text-sm font-medium">View Sources</p>
                  </AccordionTrigger>
                </div>
              </>
            )
          )}
        </div>
        {!isLoading && (
          <AccordionContent className="my-4 bg-muted pb-0 px-4 py-2 rounded-lg w-full">
            {isSourceSelectionInsufficient &&
              selectedTotal &&
              requiredTotal && (
                <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-200">
                  Insufficient selected sources balance. Selected{" "}
                  <span className="font-medium">
                    {selectedTotal} {tokenSymbol}
                  </span>
                  , need at least{" "}
                  <span className="font-medium">
                    {requiredTotal} {tokenSymbol}
                  </span>{" "}
                </div>
              )}

            {availableSources.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No source balances available for this token.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-y-3">
                {availableSources.map((source) => {
                  const chainId = source.chain.id;
                  const isSelected = selectedSourceChains.includes(chainId);
                  const isLastSelected = isSelected
                    ? selectedSourceChains.length === 1
                    : false;

                  const willUseFromIntent = intent?.sources?.find(
                    (s) => s.chainID === chainId,
                  )?.amount;
                  const showDirectDestinationSpend =
                    chainId === chain &&
                    directDestinationSpend > 0 &&
                    !willUseFromIntent;

                  return (
                    <div
                      key={chainId}
                      className={cn(
                        "flex items-center justify-between w-full gap-x-2 select-none",
                        isLastSelected
                          ? "opacity-80 cursor-not-allowed"
                          : "cursor-pointer",
                      )}
                      onClick={() => {
                        if (isLastSelected) return;
                        onToggleSourceChain(chainId);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (isLastSelected) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onToggleSourceChain(chainId);
                        }
                      }}
                    >
                      <div className="flex items-center gap-x-2">
                        <Checkbox
                          checked={isSelected}
                          disabled={isLastSelected}
                          onCheckedChange={() => {
                            if (isLastSelected) return;
                            onToggleSourceChain(chainId);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${source.chain.name} as a source`}
                        />
                        <img
                          src={source.chain.logo}
                          alt={source.chain.name}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                        <p className="text-sm font-light">
                          {source.chain.name}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-y-0.5 min-w-fit">
                        <p className="text-sm font-light">
                          {nexusSDK?.utils?.formatTokenBalance(source.balance, {
                            symbol: tokenSymbol,
                            decimals: source.decimals,
                          })}
                        </p>
                        {willUseFromIntent && (
                          <p className="text-xs text-muted-foreground">
                            Will use:{" "}
                            {nexusSDK?.utils?.formatTokenBalance(
                              willUseFromIntent,
                              {
                                symbol: tokenSymbol,
                                decimals: intent?.token?.decimals,
                              },
                            )}
                          </p>
                        )}
                        {showDirectDestinationSpend && (
                          <p className="text-xs text-muted-foreground">
                            Direct:{" "}
                            {nexusSDK?.utils?.formatTokenBalance(
                              directDestinationSpend,
                              {
                                symbol: tokenSymbol,
                                decimals: intent?.token?.decimals,
                              },
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {availableSources.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>Select at least 1 chain.</p>
              </div>
            )}
          </AccordionContent>
        )}
      </AccordionItem>
    </Accordion>
  );
};

export default SourceBreakdown;
