"use client";
import * as React from "react";
import { OpenInV0Button } from "./open-in-v0-button";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { EthereumProvider } from "@avail-project/nexus";
import { toast } from "sonner";
import { LoaderPinwheel } from "lucide-react";
import { useNexus } from "@/registry/nexus-elements/nexus/NexusProvider";

const ShowcaseWrapper = ({
  children,
  heading = "Nexus Fast Bridge",
  connectLabel = "Connect wallet to use Nexus Fast Bridge",
}: {
  children: React.ReactNode;
  heading?: string;
  connectLabel?: string;
}) => {
  const { status, connector } = useAccount();
  const { nexusSDK, handleInit } = useNexus();
  const [loading, setLoading] = React.useState(false);

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

  React.useEffect(() => {
    if (status === "connected") {
      initializeNexus();
    }
  }, [status]);

  return (
    <div className="flex flex-col gap-4 border rounded-lg p-4 min-h-[450px] relative">
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-muted-foreground sm:pl-3 font-semibold">
          {heading}
        </h2>
        <OpenInV0Button name="fast-bridge" className="w-fit" />
      </div>
      <ConnectButton />
      <div className="flex items-center justify-center min-h-[400px] relative">
        {status === "connected" && nexusSDK && <>{children}</>}
        {status !== "connected" && (
          <p className="text-lg font-semibold">{connectLabel}</p>
        )}
        {loading && <LoaderPinwheel className="size-6 animate-spin" />}
      </div>
    </div>
  );
};

export default ShowcaseWrapper;
