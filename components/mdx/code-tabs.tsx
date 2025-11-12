"use client";

import React from "react";
import {
  Tabs,
  TabsList as UITabsList,
  TabsTrigger as UITabsTrigger,
  TabsContent as UITabsContent,
} from "@/registry/nexus-elements/ui/tabs";
import { CliCommand } from "../showcase/cli-command";

type CodeTabsProps = {
  children: React.ReactNode;
};

type MDXTabsListProps = {
  children: React.ReactNode;
};

type MDXTabsTriggerProps = {
  value: string;
  children: React.ReactNode;
};

type MDXTabsContentProps = {
  value: string;
  children: React.ReactNode;
};

export function CodeTabs({ children }: CodeTabsProps) {
  return (
    <Tabs defaultValue="cli" className="my-6">
      {children}
    </Tabs>
  );
}

export function TabsList({ children }: MDXTabsListProps) {
  return <UITabsList className="h-auto p-0 w-fit">{children}</UITabsList>;
}

export function TabsTrigger({ value, children }: MDXTabsTriggerProps) {
  return (
    <UITabsTrigger value={value} className="px-2 py-2 text-sm">
      {children}
    </UITabsTrigger>
  );
}

export function TabsContent({ value, children }: MDXTabsContentProps) {
  return (
    <UITabsContent value={value} className="mt-2">
      {children}
    </UITabsContent>
  );
}

// Helper component for CLI installation with component name
export function InstallCommand({ name }: { name: string }) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://nexus-elements.vercel.app";
  const url = `${baseUrl}/r/${name}.json`;

  return <CliCommand url={url} />;
}
