"use client";
import { useIsMobile } from "@/hooks/use-mobile";
import { ConnectKitButton } from "connectkit";

const ConnectWalletButton = () => {
  const isMobile = useIsMobile();
  return <ConnectKitButton theme={"auto"} showAvatar={!!isMobile} />;
};

export default ConnectWalletButton;
