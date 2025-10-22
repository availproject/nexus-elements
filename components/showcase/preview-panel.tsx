"use client";
import * as React from "react";
import { LoaderPinwheel } from "lucide-react";
import { type EthereumProvider } from "@avail-project/nexus-core";
import { useAccount } from "wagmi";
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
  const { nexusSDK, handleInit } = useNexus();

  const initializeNexus = async () => {
    setLoading(true);
    try {
      const provider = (await connector?.getProvider()) as EthereumProvider;
      await handleInit(provider);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to initialize Nexus ${(error as Error)?.message}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-center min-h-[450px] relative">
        {(status === "connected" || status === "connecting") && nexusSDK && (
          <>{children}</>
        )}
        {(status === "connected" || status === "connecting") && !nexusSDK && (
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
