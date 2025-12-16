"use client";
import { NexusNetwork } from "@avail-project/nexus-core";
import React, { useState, useEffect } from "react";
import { useNexus } from "@/registry/nexus-elements/nexus/NexusProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/nexus-elements/ui/select";
import { getItem, setItem } from "@/lib/local-storage";
import { NETWORK_KEY } from "@/providers/Web3Provider";

const NetworkToggle = () => {
  const { nexusSDK, deinitializeNexus } = useNexus();
  const [currentNetwork, setCurrentNetwork] = useState<"testnet" | "devnet">(
    "devnet",
  );

  useEffect(() => {
    // Read from localStorage on client side only
    const storedNetwork = getItem(NETWORK_KEY) as string | null;
    if (
      storedNetwork &&
      (storedNetwork === "mainnet" ||
        storedNetwork === "testnet" ||
        storedNetwork === "devnet")
    ) {
      setCurrentNetwork(storedNetwork as "testnet" | "devnet");
    } else {
      setCurrentNetwork("devnet");
    }
  }, []);

  const handleNetworkChange = async (newValue: string) => {
    if (nexusSDK) {
      await deinitializeNexus();
    }

    setItem(NETWORK_KEY, newValue);
    setCurrentNetwork(newValue as "testnet" | "devnet");
    window.location.reload();
  };

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={currentNetwork as string}
        onValueChange={handleNetworkChange}
      >
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
