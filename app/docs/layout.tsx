import SidebarLayoutContainer from "@/components/layout/sidebar-layout-container";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayoutContainer>{children}</SidebarLayoutContainer>;
}
