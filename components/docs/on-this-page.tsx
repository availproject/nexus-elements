"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TOC_BY_PATH } from "@/lib/toc";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface OnThisPageProps {
  className?: string;
}

export function OnThisPage({ className }: OnThisPageProps) {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Determine headings for current path from a maintained map
  const pageHeadings = useMemo<Heading[]>(() => {
    if (!pathname) return [];
    // Normalize without trailing slash
    const key = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    return TOC_BY_PATH[key] ?? [];
  }, [pathname]);

  useEffect(() => {
    setHeadings(pageHeadings);
    // Set up intersection observer for active heading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-100px 0px -66%",
        threshold: 0,
      }
    );

    // Observe only ids we know about
    pageHeadings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => {
      pageHeadings.forEach((h) => {
        const el = document.getElementById(h.id);
        if (el) observer.unobserve(el);
      });
      observer.disconnect();
    };
  }, [pageHeadings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className={cn("sticky top-20", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">On This Page</h3>
      </div>
      <nav className="space-y-1">
        {headings.map((heading) => (
          <Link
            key={heading.id}
            href={`#${heading.id}`}
            className={cn(
              "block text-sm transition-colors hover:text-foreground",
              heading.level === 3 && "pl-4",
              activeId === heading.id
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById(heading.id);
              if (element) {
                element.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
                // Update URL without scrolling
                window.history.pushState(null, "", `#${heading.id}`);
              }
            }}
          >
            {heading.text}
          </Link>
        ))}
      </nav>
    </div>
  );
}
