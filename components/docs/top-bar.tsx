import dynamic from "next/dynamic";
import React from "react";
import { Skeleton } from "../ui/skeleton";
import { SidebarTrigger } from "../ui/sidebar";

const ConnectButton = dynamic(
  () => import("@rainbow-me/rainbowkit").then((m) => m.ConnectButton),
  {
    loading: () => <Skeleton className="w-24 h-9" />,
  }
);

export default function Topbar() {
  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="h-12 px-3 flex items-center justify-between md:justify-end gap-3">
        <SidebarTrigger className="block md:hidden" />
        <ConnectButton />
      </div>
    </div>
  );
}
