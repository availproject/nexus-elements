"use client";
import * as React from "react";
import { LoaderPinwheel } from "lucide-react";
import { type EthereumProvider } from "@avail-project/nexus-core";
import { useAccount, useWalletClient } from "wagmi";
import { useNexus } from "@/registry/nexus-elements/nexus/NexusProvider";
import { toast } from "sonner";
import { Button } from "@/registry/nexus-elements/ui/button";

interface PreviewPanelProps {
  children: React.ReactNode;
  connectLabel: string;
}

export function PreviewPanel({
  children,
  connectLabel,
}: Readonly<PreviewPanelProps>) {
  const [loading, setLoading] = React.useState(false);
  const { status, connector } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { nexusSDK, handleInit } = useNexus();

  const initializeNexus = async () => {
    setLoading(true);
    try {
      const wcProvider =
        walletClient &&
        ({
          request: (args: unknown) => walletClient.request(args as any),
        } as unknown as EthereumProvider);
      const provider =
        wcProvider ||
        ((await connector?.getProvider()) as EthereumProvider | undefined);
      if (!provider) {
        throw new Error("No EIP-1193 provider available");
      }
      await handleInit(provider);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to initialize Nexus ${(error as Error)?.message}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="w-full">
      <div className="flex flex-col w-full items-center justify-center min-h-[450px] relative">
        {(status === "connected" || status === "connecting") && nexusSDK && (
          <>{children}</>
        )}
        {status === "connected" && !nexusSDK && (
          <Button onClick={initializeNexus}>
            {loading ? (
              <LoaderPinwheel className="size-6 animate-spin" />
            ) : (
              "Initialize Nexus"
            )}
          </Button>
        )}
        {status !== "connected" && (
          <p className="text-lg font-semibold">{connectLabel}</p>
        )}
      </div>
    </div>
  );
}
