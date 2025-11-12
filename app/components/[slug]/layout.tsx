import React from "react";
import { SidebarLayout } from "@/components/docs/sidebar-layout";
import { CustomMDXProvider } from "@/components/mdx/mdx-provider";

export default function ComponentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarLayout>
      <CustomMDXProvider>
        <div className="flex gap-8">
          <div className="flex-1 min-w-0 max-w-4xl">{children}</div>
          <div className="hidden xl:block w-64 shrink-0">
            {/* On This Page navigation can be added here */}
          </div>
        </div>
      </CustomMDXProvider>
    </SidebarLayout>
  );
}
