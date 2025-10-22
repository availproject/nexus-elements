"use client";
import * as React from "react";
import { Button } from "@/registry/nexus-elements/ui/button";
import { toast } from "sonner";
import type { BundledLanguage } from "shiki";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

type CodeBlockProps = {
  code: string;
  filename?: string;
  lang?: BundledLanguage;
  compact?: boolean;
  className?: string;
};

export default function CodeBlock({
  code,
  filename,
  lang = "tsx",
  className = "overflow-hidden",
}: Readonly<CodeBlockProps>) {
  const [html, setHtml] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const { codeToHtml } = await import("shiki");
        const shikiTheme =
          resolvedTheme === "dark" ? "github-dark" : "github-light";
        const htmlOut = await codeToHtml(code, {
          lang: lang ?? "tsx",
          theme: shikiTheme,
        });
        if (!cancelled) setHtml(htmlOut);
      } catch {
        if (!cancelled) setHtml(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [code, lang, resolvedTheme]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  let content: React.ReactNode;
  if (loading) {
    content = (
      <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
        Loading...
      </pre>
    );
  } else if (html) {
    content = (
      <div
        className="no-scrollbar min-w-0 w-full overflow-x-scroll px-4 py-3.5 outline-none has-[[data-highlighted-line]]:px-0 has-[[data-line-numbers]]:px-0 has-[[data-slot=tabs]]:p-0"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } else {
    content = (
      <pre className="text-xs bg-muted rounded p-2 w-full overflow-x-scroll">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div className={cn("rounded-md border", className)}>
      {filename && (
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
          <span className="text-xs font-medium">{filename}</span>
          <Button size="sm" variant="ghost" onClick={onCopy}>
            Copy
          </Button>
        </div>
      )}
      <div className="relative">
        {content}
        {!filename && (
          <div className="absolute right-2 top-2">
            <Button size="sm" variant="ghost" onClick={onCopy}>
              Copy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
