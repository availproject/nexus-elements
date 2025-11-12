import { SidebarLayout } from "@/components/docs/sidebar-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experience Nexus",
  description: "Build Once, Scale Everywhere",
  icons: {
    icon: "/avail-fav.svg",
  },
};

export default function ExperienceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
