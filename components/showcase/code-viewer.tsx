"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/registry/nexus-elements/ui/button";
import CodeBlock from "../ui/code-block";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/registry/nexus-elements/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/registry/nexus-elements/ui/select";

export function CodeViewer({
  registryItemName,
}: Readonly<{ registryItemName: string }>) {
  const [sourceFiles, setSourceFiles] = useState<
    Array<{ path: string; content: string }>
  >([]);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sourceKind, setSourceKind] = useState<"component" | "provider">(
    "component"
  );

  const sourceJsonUrl = useMemo(
    () =>
      `${process.env.NEXT_PUBLIC_BASE_URL}/r/${
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

  useEffect(() => {
    loadSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKind, registryItemName]);

  const file = sourceFiles[selectedFileIdx];

  const renderCodeblock = () => {
    if (loading) {
      return (
        <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
          Loading...
        </pre>
      );
    }
    if (file) {
      return (
        <CodeBlock
          code={file.content}
          filename={file.path}
          lang={file.path.endsWith(".ts") ? "ts" : "tsx"}
          className="overflow-y-scroll max-h-[600px]"
        />
      );
    }
    return null;
  };

  return (
    <Tabs
      value={sourceKind}
      onValueChange={(v) => setSourceKind(v as "component" | "provider")}
      className="grid gap-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {sourceFiles.length > 1 && (
            <Select
              value={String(selectedFileIdx)}
              onValueChange={(value) => setSelectedFileIdx(parseInt(value))}
            >
              <SelectTrigger className="text-sm border rounded px-2 py-1 bg-background">
                <SelectValue placeholder="Select a fruit" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Components</SelectLabel>
                  {sourceFiles.map((f, i) => (
                    <SelectItem key={f.path} value={String(i)}>
                      {f.path}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TabsList className="h-auto p-0">
            <TabsTrigger value="component" className="px-2 py-1 text-xs">
              Component
            </TabsTrigger>
            <TabsTrigger value="provider" className="px-2 py-1 text-xs">
              Provider
            </TabsTrigger>
          </TabsList>
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

      {renderCodeblock()}
    </Tabs>
  );
}
