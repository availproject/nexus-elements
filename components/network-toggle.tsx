"use client";
import { NexusNetwork } from "@avail-project/nexus-core";
import * as React from "react";
import { Switch } from "./ui/switch";
import { Label } from "@/registry/nexus-elements/ui/label";
import { useRouter } from "next/navigation";
import { useNexus } from "@/registry/nexus-elements/nexus/NexusProvider";

interface NetworkToggleProps {
  currentNetwork: NexusNetwork;
}

const NetworkToggle: React.FC<NetworkToggleProps> = ({ currentNetwork }) => {
  const router = useRouter();
  const { nexusSDK, deinitializeNexus } = useNexus();
  const handleNetworkChange = () => {
    if (nexusSDK) {
      deinitializeNexus();
    }
    if (currentNetwork === "testnet") {
      router.push("/?network=mainnet");
    } else {
      router.push("/?network=testnet");
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="nexus-network"
        checked={currentNetwork === "testnet"}
        onCheckedChange={handleNetworkChange}
      />
      <Label htmlFor="nexus-network">
        {currentNetwork === "testnet" ? "Testnet Mode On" : "Testnet Mode Off"}
      </Label>
    </div>
  );
};

export default NetworkToggle;
