import * as fs from "fs";
import type { ParsedImport } from "./types";

/**
 * Parse imports from a TypeScript/TSX file using regex
 */
export function parseImports(filePath: string): ParsedImport[] {
  const content = fs.readFileSync(filePath, "utf-8");
  return parseImportsFromContent(content);
}

/**
 * Parse imports from file content
 */
export function parseImportsFromContent(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];

  // Match standard imports: import X from "source"
  // Handles: import { X } from "source"
  //          import X from "source"
  //          import * as X from "source"
  //          import type { X } from "source"
  //          import "source" (side-effect)
  const importRegex =
    /^import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*)?from\s+["']([^"']+)["']|^import\s+["']([^"']+)["']/gm;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const source = match[1] || match[2];
    if (source) {
      const isTypeOnly = match[0].includes("import type");
      imports.push({ source, isTypeOnly });
    }
  }

  // Match export * from "source" and export { X } from "source"
  const reExportRegex = /^export\s+(?:\*|(?:type\s+)?\{[^}]*\})\s+from\s+["']([^"']+)["']/gm;
  while ((match = reExportRegex.exec(content)) !== null) {
    const source = match[1];
    if (source) {
      const isTypeOnly = match[0].includes("export type");
      imports.push({ source, isTypeOnly });
    }
  }

  // Match dynamic imports: import("source")
  const dynamicImportRegex = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    const source = match[1];
    if (source) {
      imports.push({ source, isTypeOnly: false });
    }
  }

  return imports;
}

/**
 * Deduplicate imports by source
 */
export function deduplicateImports(imports: ParsedImport[]): ParsedImport[] {
  const seen = new Map<string, ParsedImport>();

  for (const imp of imports) {
    const existing = seen.get(imp.source);
    if (!existing) {
      seen.set(imp.source, imp);
    } else if (existing.isTypeOnly && !imp.isTypeOnly) {
      // Non-type import takes precedence
      seen.set(imp.source, imp);
    }
  }

  return Array.from(seen.values());
}
