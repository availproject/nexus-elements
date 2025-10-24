"use client";
import dynamic from "next/dynamic";
import React, { useEffect, useRef, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { SidebarTrigger } from "../ui/sidebar";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Monitor, Sun, Moon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/nexus-elements/ui/select";

const ConnectButton = dynamic(
  () => import("@rainbow-me/rainbowkit").then((m) => m.ConnectButton),
  {
    loading: () => <Skeleton className="w-24 h-9" />,
  }
);

const PALETTES: Record<string, string> = {
  default: "default",
  blue: "blue",
  cyber: "cyber",
  mono: "mono",
  neo: "neo",
};

export default function Topbar() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [palette, setPalette] = useState<string>("default");
  const prevPaletteClass = useRef<string | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    try {
      const saved = (localStorage.getItem("palette") as string) || "default";
      setPalette(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("palette", palette);
    } catch {}
  }, [palette]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (prevPaletteClass.current) {
      root.classList.remove(prevPaletteClass.current);
      prevPaletteClass.current = null;
    }

    if (
      palette !== "default" &&
      (resolvedTheme === "light" || resolvedTheme === "dark")
    ) {
      const cls = `${resolvedTheme}-${palette}`;
      root.classList.add(cls);
      prevPaletteClass.current = cls;
    }
  }, [palette, resolvedTheme, mounted]);

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="h-12 px-3 flex items-center justify-between md:justify-end gap-3">
        <SidebarTrigger className="block md:hidden" />
        {mounted ? (
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(v) => v && setTheme(v)}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Toggle theme"
          >
            <ToggleGroupItem value="system" aria-label="System theme">
              <Monitor />
            </ToggleGroupItem>
            <ToggleGroupItem value="light" aria-label="Light theme">
              <Sun />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark theme">
              <Moon />
            </ToggleGroupItem>
          </ToggleGroup>
        ) : (
          <Skeleton className="w-[118px] h-9" />
        )}
        {mounted ? (
          <Select
            defaultValue={"default"}
            value={palette}
            onValueChange={(v) => setPalette(PALETTES[v])}
          >
            <SelectTrigger size="sm" aria-label="Choose color palette">
              <SelectValue placeholder="Palette" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(PALETTES).map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Skeleton className="w-[156px] h-9" />
        )}
        <ConnectButton showBalance={false} />
      </div>
    </div>
  );
}
