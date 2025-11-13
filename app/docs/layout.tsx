import { OnThisPage } from "@/components/helpers/on-this-page";
import { SidebarLayout } from "@/components/layout/sidebar-layout";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarLayout>
      <div className="flex gap-8">
        <div className="flex-1 min-w-0 max-w-4xl">{children}</div>
        <div className="hidden xl:block w-64 shrink-0">
          <OnThisPage />
        </div>
      </div>
    </SidebarLayout>
  );
}
