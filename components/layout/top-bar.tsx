"use client";
import dynamic from "next/dynamic";
import React, { useEffect, useRef, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { useTheme } from "next-themes";
import Link, { type LinkProps } from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/registry/nexus-elements/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/nexus-elements/ui/popover";
import ThemeControl from "./theme-control";
const ConnectWalletButton = dynamic(
  () =>
    import("@/components/helpers/wallet-connect-button").then((m) => m.default),
  {
    loading: () => <Skeleton className="w-24 h-9" />,
  }
);

const NAV_ITEMS = [
  // {
  //   sectionId: "experience-nexus",
  //   section: "Experience Nexus",
  //   children: [
  //     {
  //       id: "experience",
  //       label: "Build Once, Scale Everywhere",
  //       href: "/experience",
  //     },
  //   ],
  // },
  {
    sectionId: "get-started",
    section: "Get Started",
    children: [
      {
        id: "installation",
        label: "Installation",
        href: "/docs/get-started",
      },
      {
        id: "components",
        label: "Components",
        href: "/docs/view-components",
      },
    ],
  },
  {
    sectionId: "components",
    section: "Components",
    children: [
      {
        id: "deposit",
        label: "Deposit",
        href: "/docs/components/deposit",
      },
      {
        id: "fast-bridge",
        label: "Fast Bridge",
        href: "/docs/components/fast-bridge",
      },

      {
        id: "swaps",
        label: "Swaps",
        href: "/docs/components/swaps",
      },
      {
        id: "unified-balance",
        label: "Unified Balance",
        href: "/docs/components/unified-balance",
      },
    ],
  },
];

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
  ...props
}: LinkProps & {
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={() => {
        router.push(href as string);
        onOpenChange?.(false);
      }}
      className={cn("text-2xl font-medium", className)}
      {...props}
    >
      {children}
    </Link>
  );
}

function MobileNav({
  items,
  componentItems,
  className,
}: Readonly<{
  items: { href: string; label: string }[];
  componentItems: { href: string; label: string }[];
  className?: string;
}>) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "extend-touch-target h-8  touch-manipulation items-center justify-start gap-2.5 p-0 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent dark:hover:bg-transparent",
            className
          )}
        >
          <div className="flex items-center gap-x-2">
            <div className="relative flex h-8 w-4 items-center justify-center">
              <div className="relative size-4">
                <span
                  className={cn(
                    "bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100",
                    open ? "top-[0.4rem] -rotate-45" : "top-1"
                  )}
                />
                <span
                  className={cn(
                    "bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100",
                    open ? "top-[0.4rem] rotate-45" : "top-2.5"
                  )}
                />
              </div>
              <span className="sr-only">Toggle Menu</span>
            </div>
            <span className="flex h-8 items-center text-lg leading-none font-medium">
              Menu
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="bg-background/90 no-scrollbar h-(--radix-popper-available-height) w-(--radix-popper-available-width) overflow-y-auto rounded-none border-none p-0 shadow-none backdrop-blur duration-100"
        align="start"
        side="bottom"
        alignOffset={-16}
        sideOffset={14}
      >
        <div className="flex flex-col gap-12 overflow-auto px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="text-muted-foreground text-sm font-medium">
              Menu
            </div>
            <div className="flex flex-col gap-3">
              <MobileLink href="/" onOpenChange={setOpen}>
                Home
              </MobileLink>
              {items.map((item) => (
                <MobileLink
                  key={item.label}
                  href={item.href}
                  onOpenChange={setOpen}
                >
                  {item.label}
                </MobileLink>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="text-muted-foreground text-sm font-medium">
              Components
            </div>
            <div className="flex flex-col gap-3">
              {componentItems.map((item, idx) => (
                <MobileLink
                  key={`${item.href}-${idx}`}
                  href={item.href}
                  onOpenChange={setOpen}
                >
                  {item.label}
                </MobileLink>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Topbar() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
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

  const componentsGroup = NAV_ITEMS.find((g) => g.sectionId === "components");
  const componentItems =
    componentsGroup?.children?.map((c) => ({ href: c.href, label: c.label })) ??
    [];
  const topItems: { href: string; label: string }[] = [
    { href: "/docs/get-started", label: "Docs" },
    { href: "/docs/view-components", label: "Components" },
  ];

  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="h-(--header-height) px-4 py-4 flex items-center justify-between gap-4 ">
        <div className="flex items-center gap-x-6">
          <Link href={"/"} className={cn("cursor-pointer")}>
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
          <MobileNav
            items={topItems}
            componentItems={componentItems}
            className="block lg:hidden"
          />
          <Link
            href="/docs/get-started"
            className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors hidden lg:inline-block"
          >
            Docs
          </Link>
          <Link
            href="/docs/view-components"
            className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors hidden lg:inline-block"
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
          {mounted ? (
            <ThemeControl
              theme={theme ?? ""}
              setTheme={setTheme}
              palette={palette}
              setPalette={setPalette}
              isMobile={isMobile}
            />
          ) : (
            <Skeleton className="w-[118px] h-9" />
          )}

          <ConnectWalletButton />
        </div>
      </div>
    </div>
  );
}
