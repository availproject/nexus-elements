"use client";
import { NexusNetwork } from "@avail-project/nexus-core";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
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
  disabled?: boolean;
}

const NetworkToggle: React.FC<NetworkToggleProps> = ({
  currentNetwork,
  disabled = false,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { nexusSDK, deinitializeNexus } = useNexus();

  const handleNetworkChange = () => {
    if (disabled) return;
    if (nexusSDK) {
      deinitializeNexus();
    }
    router.push(
      `${pathname}?network=${
        currentNetwork === "testnet" ? "devnet" : "testnet"
      }`
    );
    router.refresh();
  };

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={currentNetwork}
        onValueChange={handleNetworkChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a network" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="testnet">Testnet</SelectItem>
          <SelectItem value="devnet">Mainnet</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default NetworkToggle;
