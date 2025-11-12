"use client";
import { useState } from "react";

export function DocsCopyPage({ page }: { page: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(page);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="border rounded px-3 py-1 text-sm"
      aria-label="Copy page content"
    >
      {copied ? "Copied" : "Copy Page"}
    </button>
  );
}


