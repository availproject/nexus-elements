"use client";

import React, { useEffect, useState } from "react";
import { CodeSnippet } from "../showcase/code-snippet";
import { Skeleton } from "../ui/skeleton";

type ComponentSourceProps = {
  name: string;
  title?: string;
  kind?: "component" | "provider";
};

export function ComponentSource({
  name,
  title,
  kind = "component",
}: ComponentSourceProps) {
  const [sourceFiles, setSourceFiles] = useState<
    Array<{ path: string; content: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceJsonUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/r/${
    kind === "component" ? name : "nexus-provider"
  }.json`;

  useEffect(() => {
    let isCancelled = false;
    const loadSource = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(sourceJsonUrl);
        if (!res.ok) throw new Error(`Failed to fetch ${sourceJsonUrl}`);
        const json = await res.json();
        const files: Array<{ path: string; content: string }> =
          json?.files || [];
        if (!isCancelled) setSourceFiles(files);
      } catch (e) {
        if (!isCancelled)
          setError((e as Error)?.message || "Failed to load source");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    loadSource();
    return () => {
      isCancelled = true;
    };
  }, [sourceJsonUrl]);

  if (loading) {
    return <Skeleton className="w-full h-64" />;
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (sourceFiles.length === 0) {
    return null;
  }

  // Show the first file, or find the file matching the title
  const file =
    title &&
    sourceFiles.find((f) => f.path.includes(title.split("/").pop() || ""))
      ? sourceFiles.find((f) => f.path.includes(title.split("/").pop() || ""))
      : sourceFiles[0];

  if (!file) {
    return null;
  }

  const lang = file.path.endsWith(".ts") ? "ts" : "tsx";
  const filename = title || file.path;

  return (
    <CodeSnippet
      code={file.content}
      filename={filename}
      lang={lang}
      variant="default"
    />
  );
}
