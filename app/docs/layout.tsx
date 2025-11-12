import SidebarLayoutContainer from "@/components/layout/sidebar-layout-container";
import { OnThisPage } from "@/components/docs/on-this-page";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarLayoutContainer>
      <div className="flex gap-8">
        <div className="flex-1 min-w-0 max-w-4xl">{children}</div>
        <div className="hidden xl:block w-64 shrink-0">
          <OnThisPage />
        </div>
      </div>
    </SidebarLayoutContainer>
  );
}
