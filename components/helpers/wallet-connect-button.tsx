"use client";
import { Button } from "@/registry/nexus-elements/ui/button";
import { ConnectKitButton } from "connectkit";
import { truncateAddress } from "@avail-project/nexus-core";

const ConnectWalletButton = () => {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, hide, address, ensName, chain }) => {
        return (
          <Button size={"sm"} onClick={show} variant={"outline"}>
            {isConnected ? truncateAddress(address ?? "", 6, 6) : "Connect"}
          </Button>
        );
      }}
    </ConnectKitButton.Custom>
  );
};

export default ConnectWalletButton;
