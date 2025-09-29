"use client";
import { NexusNetwork } from "@avail-project/nexus-core";
import React from "react";
import { useRouter } from "next/navigation";
import { useNexus } from "@/registry/nexus-elements/nexus/NexusProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/nexus-elements/ui/select";

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
      <Select value={currentNetwork} onValueChange={handleNetworkChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a network" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="testnet">Testnet</SelectItem>
          <SelectItem value="mainnet">Mainnet</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default NetworkToggle;
