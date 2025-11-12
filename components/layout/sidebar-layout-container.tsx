import { SidebarLayout } from "@/components/docs/sidebar-layout";
import Topbar from "@/components/docs/top-bar";

export default function SidebarLayoutContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Topbar />
      <SidebarLayout>{children}</SidebarLayout>
    </>
  );
}
