"use client";
import React, { ReactNode, useEffect } from "react";
import { LoaderPinwheel } from "lucide-react";
import { type EthereumProvider } from "@avail-project/nexus-core";
import { useAccount, useConnectorClient } from "wagmi";
import { useNexus } from "@/registry/nexus-elements/nexus/NexusProvider";
import { toast } from "sonner";
import { Button } from "@/registry/nexus-elements/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
interface PreviewPanelProps {
  children: ReactNode;
  connectLabel: string;
  allowDisconnected?: boolean;
}

export function PreviewPanel({
  children,
  connectLabel,
  allowDisconnected = false,
}: Readonly<PreviewPanelProps>) {
  const { status, connector } = useAccount();
  const { data: walletClient } = useConnectorClient();
  const { nexusSDK, handleInit, loading } = useNexus();
  const isMobile = useIsMobile();

  const initializeNexus = async () => {
    try {
      const mobileProvider = walletClient && {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        request: (args: unknown) => walletClient.request(args as any),
      };
      const desktopProvider = await connector?.getProvider();
      const effectiveProvider = isMobile ? mobileProvider : desktopProvider;

      await handleInit(effectiveProvider as EthereumProvider);
      if (nexusSDK) {
        toast.success("Nexus initialized successfully");
      }
    } catch (error) {
      console.error(error);
      toast.error(`Failed to initialize Nexus ${(error as Error)?.message}`);
    }
  };

  useEffect(() => {
    if (status === "connected" && !nexusSDK) {
      initializeNexus();
    }
  }, [status, nexusSDK]);
  const shouldRenderChildren =
    allowDisconnected ||
    ((status === "connected" || status === "connecting") && nexusSDK);

  const showInitButton =
    !allowDisconnected && status === "connected" && !nexusSDK;

  const showConnectLabel = !allowDisconnected && status !== "connected";

  return (
    <div className="w-full">
      <div className="flex flex-col w-full items-center justify-center min-h-[450px] relative">
        {shouldRenderChildren && <>{children}</>}
        {showInitButton && (
          <Button onClick={initializeNexus}>
            {loading ? (
              <LoaderPinwheel className="size-6 animate-spin" />
            ) : (
              "Initialize Nexus"
            )}
          </Button>
        )}
        {showConnectLabel && (
          <p className="text-lg font-semibold">{connectLabel}</p>
        )}
      </div>
    </div>
  );
}
