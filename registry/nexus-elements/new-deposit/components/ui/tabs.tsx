"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "../../utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    const updateIndicator = () => {
      if (!listRef.current) return;
      
      const activeTab = listRef.current.querySelector('[data-state="active"]') as HTMLElement;
      if (activeTab) {
        setIndicatorStyle({
          left: activeTab.offsetLeft,
          width: activeTab.offsetWidth,
        });
      }
    };

    updateIndicator();

    // Observe for changes in the active tab
    const observer = new MutationObserver(updateIndicator);
    if (listRef.current) {
      observer.observe(listRef.current, { 
        attributes: true, 
        subtree: true,
        attributeFilter: ['data-state']
      });
    }

    // Also update on resize
    window.addEventListener('resize', updateIndicator);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateIndicator);
    };
  }, []);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-[42px] items-center p-1 relative",
        className
      )}
      {...props}
    >
      {/* Sliding indicator */}
      <div
        className="absolute top-1 bottom-1 bg-base shadow-[0_1px_12px_0_rgba(91,91,91,0.05)] transition-all duration-200 ease-out pointer-events-none"
        style={indicatorStyle}
      />
      {props.children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "py-2 px-4 text-[13px] leading-4.5 font-sans text-muted-foreground inline-flex items-center justify-center whitespace-nowrap transition-colors duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground relative z-10",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
