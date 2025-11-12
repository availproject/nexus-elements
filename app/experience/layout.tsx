import { SidebarLayout } from "@/components/docs/sidebar-layout";

export default function ExperienceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayout>{children}</SidebarLayout>;
}

