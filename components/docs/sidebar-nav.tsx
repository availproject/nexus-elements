"use client";
import React from "react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    sectionId: "experience-nexus",
    section: "Experience Nexus",
    children: [
      {
        id: "experience",
        label: "Build Once, Scale Everywhere",
        href: "/experience",
      },
    ],
  },
  {
    sectionId: "get-started",
    section: "Get Started",
    children: [
      {
        id: "installation",
        label: "Installation",
        href: "/docs/get-started",
      },
    ],
  },
  {
    sectionId: "components",
    section: "Components",
    children: [
      {
        id: "fast-bridge",
        label: "Fast Bridge",
        href: "/components/fast-bridge",
      },
      {
        id: "deposit",
        label: "Deposit",
        href: "/components/deposit",
      },
      {
        id: "swaps",
        label: "Swaps",
        href: "/components/swaps",
      },
      {
        id: "unified-balance",
        label: "Unified Balance",
        href: "/components/unified-balance",
      },
    ],
  },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <>
      {NAV_ITEMS.map((items) => {
        return (
          <SidebarGroup className="border-none" key={items.sectionId}>
            <SidebarGroupLabel>{items.section}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.children.map((child) => {
                  return (
                    <SidebarMenuItem key={child.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(child.href)}
                      >
                        <Link href={child.href}>
                          <p className="text-sm">{child.label}</p>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
}
