"use client";
import * as React from "react";
import { Button } from "@/registry/nexus-elements/ui/button";
import { toast } from "sonner";
import type { BundledLanguage } from "shiki";
import { cn } from "@/lib/utils";

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

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const { codeToHtml } = await import("shiki");
        const htmlOut = await codeToHtml(code, {
          lang: (lang ?? "tsx") as BundledLanguage,
          themes: { light: "github-light", dark: "github-dark" },
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
  }, [code, lang]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

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
        {loading ? (
          <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
            Loading...
          </pre>
        ) : html ? (
          <div
            className="no-scrollbar min-w-0 w-full max-w-4xl overflow-x-scroll px-4 py-3.5 outline-none has-[[data-highlighted-line]]:px-0 has-[[data-line-numbers]]:px-0 has-[[data-slot=tabs]]:p-0 !bg-transparent"
            style={{
              backgroundColor: "#fff",
              color: "#24292e",
              // @ts-expect-error CSS custom properties used by Shiki
              "--shiki-dark-bg": "#24292e",
              "--shiki-dark": "#e1e4e8",
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="text-xs bg-muted rounded p-2 w-full overflow-x-scroll">
            <code>{code}</code>
          </pre>
        )}
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
