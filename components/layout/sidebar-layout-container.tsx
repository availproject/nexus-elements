import { SidebarLayout } from "@/components/docs/sidebar-layout";

export default function SidebarLayoutContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
