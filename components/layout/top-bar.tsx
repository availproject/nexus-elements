"use client";
import dynamic from "next/dynamic";
import React, { useEffect, useRef, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Sun, Moon, Palette } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/nexus-elements/ui/select";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/registry/nexus-elements/ui/dialog";

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

// function ConditionalSidebarTrigger() {
//   const pathname = usePathname();
//   // Only show sidebar trigger on pages that have sidebar (components and experience)
//   const hasSidebar =
//     pathname?.startsWith("/components") || pathname === "/experience";

//   if (hasSidebar) {
//     return <SidebarTrigger className="block md:hidden" />;
//   }

//   // Fallback: render a menu button that doesn't require sidebar context
//   return (
//     <Button
//       variant="ghost"
//       size="sm"
//       className="block md:hidden"
//       aria-label="Menu"
//     >
//       <Menu className="h-4 w-4" />
//     </Button>
//   );
// }

type ThemeControlProps = {
  mounted: boolean;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  palette: string;
  setPalette: React.Dispatch<React.SetStateAction<string>>;
};

const ThemeControl = ({
  mounted,
  theme,
  setTheme,
  palette,
  setPalette,
}: ThemeControlProps) => {
  return (
    <div className="flex items-center gap-x-2">
      {mounted ? (
        <>
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(v) => v && setTheme(v)}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Toggle theme"
          >
            <ToggleGroupItem value="light" aria-label="Light theme">
              <Sun className="size-3" />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark theme">
              <Moon className="size-3" />
            </ToggleGroupItem>
          </ToggleGroup>
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
        </>
      ) : (
        <Skeleton className="w-[118px] h-9" />
      )}
    </div>
  );
};

const MobileThemeControl = ({
  mounted,
  theme,
  setTheme,
  palette,
  setPalette,
}: ThemeControlProps) => {
  return (
    <Dialog>
      <DialogTrigger>
        <Palette className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <ThemeControl
          mounted={mounted}
          theme={theme}
          setTheme={setTheme}
          palette={palette}
          setPalette={setPalette}
        />
      </DialogContent>
    </Dialog>
  );
};

export default function Topbar() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const hasSidebar =
    pathname?.startsWith("/docs") || pathname?.startsWith("/experience");
  const [palette, setPalette] = useState<string>("default");
  const prevPaletteClass = useRef<string | null>(null);
  const isMobile = useIsMobile();

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
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
      <div className="h-(--header-height) px-4 py-4 flex items-center justify-between gap-4 ">
        <div className="flex items-center gap-x-6">
          <Link
            href={"/"}
            className={cn("cursor-pointer", hasSidebar && !isMobile && "w-58")}
          >
            <Image
              src="/avail-light-logo.svg"
              alt="Nexus Elements"
              width={30}
              height={30}
              className="hidden dark:block"
            />
            <Image
              src="/avail-logo.svg"
              alt="Nexus Elements"
              width={30}
              height={30}
              className="block dark:hidden"
            />
          </Link>
          <Link
            href="/docs/get-started"
            className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/docs/view-components"
            className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
          >
            Components
          </Link>
        </div>

        {/* Search bar */}
        {/* <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documentation..."
              className="pl-9 pr-20 h-9 w-full"
              disabled
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div> */}

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {isMobile ? (
            <MobileThemeControl
              mounted={mounted}
              theme={theme ?? ""}
              setTheme={setTheme}
              palette={palette}
              setPalette={setPalette}
            />
          ) : (
            <ThemeControl
              mounted={mounted}
              theme={theme ?? ""}
              setTheme={setTheme}
              palette={palette}
              setPalette={setPalette}
            />
          )}

          <ConnectButton
            showBalance={false}
            chainStatus={isMobile ? "none" : "icon"}
            accountStatus={"avatar"}
          />
        </div>
      </div>
    </div>
  );
}
