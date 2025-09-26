"use client";
import * as React from "react";
import { Button } from "@/registry/nexus-elements/ui/button";
import CodeBlock from "../ui/code-block";
import { toast } from "sonner";

export function CodeViewer({
  registryItemName,
}: Readonly<{ registryItemName: string }>) {
  const [sourceFiles, setSourceFiles] = React.useState<
    Array<{ path: string; content: string }>
  >([]);
  const [selectedFileIdx, setSelectedFileIdx] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [sourceKind, setSourceKind] = React.useState<"component" | "provider">(
    "component"
  );

  const sourceJsonUrl = React.useMemo(
    () =>
      `https://elements.nexus.availproject.org/r/${
        sourceKind === "component" ? registryItemName : "nexus-provider"
      }.json`,
    [registryItemName, sourceKind]
  );

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (e) {
      console.error(e);
      toast.error("Failed to copy");
    }
  };

  const loadSource = async () => {
    setLoading(true);
    try {
      const res = await fetch(sourceJsonUrl);
      const json = await res.json();
      const files: Array<{ path: string; content: string }> = json?.files || [];
      setSourceFiles(files);
      setSelectedFileIdx(0);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load source");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKind, registryItemName]);

  const file = sourceFiles[selectedFileIdx];

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {sourceFiles.length > 1 && (
            <select
              className="text-sm border rounded px-2 py-1 bg-background"
              value={selectedFileIdx}
              onChange={(e) => setSelectedFileIdx(parseInt(e.target.value))}
            >
              {sourceFiles.map((f, i) => (
                <option key={f.path} value={i}>
                  {f.path}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <button
              className={`px-2 py-1 rounded border ${
                sourceKind === "component" ? "bg-accent" : ""
              }`}
              onClick={() => setSourceKind("component")}
            >
              Component
            </button>
            <button
              className={`px-2 py-1 rounded border ${
                sourceKind === "provider" ? "bg-accent" : ""
              }`}
              onClick={() => setSourceKind("provider")}
            >
              Provider
            </button>
          </div>
          {file && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copy(file.content)}
            >
              Copy file
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
          Loading...
        </pre>
      ) : file ? (
        <CodeBlock
          code={file.content}
          filename={file.path}
          lang={file.path.endsWith(".ts") ? "ts" : "tsx"}
          className="overflow-y-scroll max-h-[600px]"
        />
      ) : null}
    </div>
  );
}
