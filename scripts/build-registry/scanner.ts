import * as fs from "fs";
import * as path from "path";
import type { ScannedComponent, ComponentType, RegistryConfig } from "./types";

/**
 * Check if a path is a TypeScript/TSX file
 */
function isSourceFile(filePath: string): boolean {
  return /\.(tsx?|jsx?)$/.test(filePath);
}

/**
 * Get all source files in a directory recursively
 */
function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (isSourceFile(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  if (fs.existsSync(dir)) {
    walk(dir);
  }
  return files;
}

/**
 * Detect component type based on folder structure
 */
function detectComponentType(
  componentPath: string,
  componentName: string
): ComponentType {
  const stat = fs.statSync(componentPath);

  // If it's a file (not a directory), it's a UI primitive
  if (stat.isFile()) {
    return "ui-primitive";
  }

  // Check folder contents for type hints
  const entries = fs.readdirSync(componentPath);

  // nexus/ folder is the provider
  if (componentName === "nexus") {
    return "provider";
  }

  // common/ folder is shared utilities
  if (componentName === "common") {
    return "shared";
  }

  // If it has components/ or hooks/ subfolders, it's a complex widget
  const hasSubfolders = entries.some((entry) => {
    const fullPath = path.join(componentPath, entry);
    return (
      fs.statSync(fullPath).isDirectory() &&
      ["components", "hooks", "config", "utils", "constants"].includes(entry)
    );
  });

  if (hasSubfolders) {
    return "complex-widget";
  }

  // Default to ui-primitive for simple folders
  return "ui-primitive";
}

/**
 * Find the main entry file for a component
 */
function findEntryFile(
  componentPath: string,
  componentName: string
): string | undefined {
  const stat = fs.statSync(componentPath);

  // If it's a file, that's the entry
  if (stat.isFile()) {
    return componentPath;
  }

  // Look for common entry file patterns
  const candidates = [
    `${componentName}.tsx`,
    `${componentName}.ts`,
    "index.tsx",
    "index.ts",
    `nexus-${componentName}.tsx`, // e.g., nexus-deposit.tsx
    `${componentName}-widget.tsx`, // e.g., swap-widget.tsx
  ];

  const entries = fs.readdirSync(componentPath);

  // Also check for files that match the folder name pattern
  for (const entry of entries) {
    if (
      entry.endsWith(".tsx") &&
      !entry.includes("/") &&
      entries.includes(entry)
    ) {
      // Check if it looks like a main component file
      const baseName = entry.replace(/\.tsx?$/, "");
      if (
        baseName === componentName ||
        baseName === `nexus-${componentName}` ||
        baseName.includes("widget") ||
        baseName === componentName.replace(/-/g, "")
      ) {
        candidates.unshift(entry);
      }
    }
  }

  for (const candidate of candidates) {
    const candidatePath = path.join(componentPath, candidate);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  // If no standard entry found, look for any .tsx file in root
  const rootTsxFiles = entries.filter(
    (e) => e.endsWith(".tsx") && !fs.statSync(path.join(componentPath, e)).isDirectory()
  );
  if (rootTsxFiles.length === 1) {
    return path.join(componentPath, rootTsxFiles[0]);
  }

  return undefined;
}

/**
 * Scan UI primitives (files in ui/ folder)
 */
function scanUiPrimitives(uiFolder: string): ScannedComponent[] {
  const components: ScannedComponent[] = [];

  if (!fs.existsSync(uiFolder)) {
    return components;
  }

  const entries = fs.readdirSync(uiFolder, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && isSourceFile(entry.name)) {
      const name = entry.name.replace(/\.(tsx?|jsx?)$/, "");
      const fullPath = path.join(uiFolder, entry.name);

      components.push({
        name,
        type: "ui-primitive",
        path: fullPath,
        files: [fullPath],
        entryFile: fullPath,
      });
    }
  }

  return components;
}

/**
 * Scan complex components (folders with substructure)
 */
function scanComplexComponents(
  registryPath: string,
  excludeFolders: string[]
): ScannedComponent[] {
  const components: ScannedComponent[] = [];

  const entries = fs.readdirSync(registryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (excludeFolders.includes(entry.name)) continue;

    const componentPath = path.join(registryPath, entry.name);
    const componentName = entry.name;
    const type = detectComponentType(componentPath, componentName);

    // Get all source files for this component
    const files = getAllSourceFiles(componentPath);
    const entryFile = findEntryFile(componentPath, componentName);

    components.push({
      name: componentName,
      type,
      path: componentPath,
      files,
      entryFile,
    });
  }

  return components;
}

/**
 * Scan the lib/utils.ts file (special case)
 */
function scanUtilsComponent(projectRoot: string): ScannedComponent | undefined {
  const utilsPath = path.join(projectRoot, "lib", "utils.ts");

  if (fs.existsSync(utilsPath)) {
    return {
      name: "utils",
      type: "shared",
      path: utilsPath,
      files: [utilsPath],
      entryFile: utilsPath,
    };
  }

  return undefined;
}

/**
 * Scan the entire registry and discover all components
 */
export function scanRegistry(config: RegistryConfig): ScannedComponent[] {
  const projectRoot = process.cwd();
  const registryPath = path.join(projectRoot, config.registryPath);

  if (!fs.existsSync(registryPath)) {
    throw new Error(`Registry path not found: ${registryPath}`);
  }

  const components: ScannedComponent[] = [];

  // 1. Scan UI primitives
  const uiFolder = path.join(registryPath, "ui");
  const uiComponents = scanUiPrimitives(uiFolder);
  components.push(...uiComponents);

  // 2. Scan complex components (exclude ui folder)
  const complexComponents = scanComplexComponents(registryPath, ["ui"]);
  components.push(...complexComponents);

  // 3. Add utils component
  const utils = scanUtilsComponent(projectRoot);
  if (utils) {
    components.push(utils);
  }

  return components;
}

/**
 * Get the common/ folder files that should be included with complex widgets
 */
export function getCommonFiles(config: RegistryConfig): string[] {
  const commonPath = path.join(process.cwd(), config.registryPath, "common");
  if (!fs.existsSync(commonPath)) {
    return [];
  }
  return getAllSourceFiles(commonPath);
}
