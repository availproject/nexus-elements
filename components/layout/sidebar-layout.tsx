import React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
} from "@/components/ui/sidebar";
import SidebarNav from "./sidebar-nav";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar className="sticky top-[calc(var(--header-height)+1px)] z-30 h-[calc(100svh-var(--header-height))] border-none bg-background pt-2">
        <SidebarContent className="bg-background">
          <SidebarNav />
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="px-2 py-6 sm:p-6 lg:px-8 lg:py-4 max-w-7xl mx-auto w-full">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
