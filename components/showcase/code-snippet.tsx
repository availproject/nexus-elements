"use client";
import * as React from "react";
import { Button } from "@/registry/nexus-elements/ui/button";
import { toast } from "sonner";
import type { BundledLanguage } from "shiki";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Copy } from "lucide-react";

type CodeSnippetProps = {
  code: string;
  filename?: string;
  lang?: BundledLanguage;
  className?: string;
  variant?: "default" | "usage" | "example";
};

const getLanguageIcon = (lang?: string, filename?: string): string => {
  if (filename) {
    if (filename.endsWith(".tsx")) return "TSX";
    if (filename.endsWith(".ts")) return "TS";
    if (filename.endsWith(".jsx")) return "JSX";
    if (filename.endsWith(".js")) return "JS";
    if (filename.endsWith(".json")) return "JSON";
  }
  if (lang) {
    if (lang === "tsx") return "TSX";
    if (lang === "typescript" || lang === "ts") return "TS";
    if (lang === "jsx") return "JSX";
    if (lang === "javascript" || lang === "js") return "JS";
    if (lang === "json") return "JSON";
    if (lang === "bash" || lang === "sh") return "SH";
  }
  return "TSX";
};

export function CodeSnippet({
  code,
  filename,
  lang = "tsx",
  className,
  variant = "default",
}: Readonly<CodeSnippetProps>) {
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

  const languageIcon = getLanguageIcon(lang, filename);

  let content: React.ReactNode;
  if (loading) {
    content = (
      <pre className="text-sm p-4 overflow-x-auto">
        <code className="text-muted-foreground">Loading...</code>
      </pre>
    );
  } else if (html) {
    content = (
      <div
        className="no-scrollbar min-w-0 w-full overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          padding: "1rem",
        }}
      />
    );
  } else {
    content = (
      <pre className="text-sm p-4 w-full overflow-x-auto">
        <code className="text-[#c9d1d9]">{code}</code>
      </pre>
    );
  }

  if (variant === "usage") {
    return (
      <div className={cn("space-y-3", className)}>
        {filename && (
          <div className="rounded-lg border bg-transparent overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-[10px] font-medium text-muted-foreground">
                  {languageIcon}
                </div>
                <span className="text-sm font-mono text-muted-foreground">
                  {filename}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCopy}
                className="h-7 w-7 p-0"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="relative">{content}</div>
          </div>
        )}
        {!filename && (
          <div className="rounded-lg border bg-background overflow-hidden">
            <div className="relative ">
              {content}
              <div className="absolute right-2 top-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCopy}
                  className="h-7 w-7 p-0 bg-background/80 hover:bg-background"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-background overflow-hidden",
        className
      )}
    >
      {filename && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-[10px] font-medium text-muted-foreground">
              {languageIcon}
            </div>
            <span className="text-sm font-mono text-muted-foreground">
              {filename}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCopy}
            className="h-7 w-7 p-0"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div className="relative ">
        {content}
        {!filename && (
          <div className="absolute right-2 top-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onCopy}
              className="h-7 w-7 p-0 bg-background/80 hover:bg-background"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
