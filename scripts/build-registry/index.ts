#!/usr/bin/env npx ts-node

import * as fs from "fs";
import * as path from "path";
import { loadConfig, getProjectRoot } from "./config";
import { buildRegistry, validateRegistry } from "./registry-builder";
import { scanRegistry } from "./scanner";
import type { RegistryConfig } from "./types";

interface CliOptions {
  config?: string;
  output?: string;
  baseUrl?: string;
  dryRun?: boolean;
  verbose?: boolean;
  validate?: boolean;
  scan?: string;
  help?: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-c":
      case "--config":
        options.config = args[++i];
        break;
      case "-o":
      case "--output":
        options.output = args[++i];
        break;
      case "--base-url":
        options.baseUrl = args[++i];
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "-v":
      case "--verbose":
        options.verbose = true;
        break;
      case "--validate":
        options.validate = true;
        break;
      case "--scan":
        options.scan = args[++i];
        break;
      case "-h":
      case "--help":
        options.help = true;
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
build-registry - Generate shadcn registry.json from component files

Usage:
  npx ts-node scripts/build-registry [options]

Options:
  -c, --config <path>    Path to config file (default: registry.config.json)
  -o, --output <path>    Output path for registry.json
  --base-url <url>       Base URL for registry dependencies
  --dry-run              Print output without writing file
  -v, --verbose          Enable verbose logging
  --validate             Validate existing registry.json
  --scan <component>     Scan a single component (for debugging)
  -h, --help             Show this help message

Examples:
  npx ts-node scripts/build-registry
  npx ts-node scripts/build-registry --dry-run
  npx ts-node scripts/build-registry --base-url https://my-registry.com/r
  npx ts-node scripts/build-registry --scan deposit
  npx ts-node scripts/build-registry --validate
`);
}

async function main() {
  // Change to project root
  const projectRoot = getProjectRoot();
  process.chdir(projectRoot);

  // Parse CLI arguments
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Load configuration
  const overrides: Partial<RegistryConfig> = {};
  if (options.output) overrides.outputPath = options.output;
  if (options.baseUrl) overrides.baseUrl = options.baseUrl;

  const config = loadConfig(options.config, overrides);

  if (options.verbose) {
    console.log("Configuration:", JSON.stringify(config, null, 2));
  }

  // Handle validate command
  if (options.validate) {
    const registryPath = path.join(projectRoot, config.outputPath);
    if (!fs.existsSync(registryPath)) {
      console.error(`Registry file not found: ${registryPath}`);
      process.exit(1);
    }

    const existingRegistry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
    const validation = validateRegistry(existingRegistry);

    if (validation.errors.length > 0) {
      console.error("Validation errors:");
      for (const error of validation.errors) {
        console.error(`  - ${error}`);
      }
    }

    if (validation.warnings.length > 0) {
      console.warn("Validation warnings:");
      for (const warning of validation.warnings) {
        console.warn(`  - ${warning}`);
      }
    }

    if (validation.valid) {
      console.log("Registry is valid!");
      process.exit(0);
    } else {
      process.exit(1);
    }
  }

  // Handle scan command (debug single component)
  if (options.scan) {
    const components = scanRegistry(config);
    const component = components.find((c) => c.name === options.scan);

    if (!component) {
      console.error(`Component not found: ${options.scan}`);
      console.log("Available components:", components.map((c) => c.name).join(", "));
      process.exit(1);
    }

    console.log("Component:", JSON.stringify(component, null, 2));
    process.exit(0);
  }

  // Build registry
  console.log("Building registry...");
  const registry = buildRegistry(config);

  // Validate generated registry
  const validation = validateRegistry(registry);
  if (validation.warnings.length > 0 && options.verbose) {
    console.warn("Warnings:");
    for (const warning of validation.warnings) {
      console.warn(`  - ${warning}`);
    }
  }

  if (!validation.valid) {
    console.error("Generated registry has errors:");
    for (const error of validation.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  // Output
  const output = JSON.stringify(registry, null, 2);

  if (options.dryRun) {
    console.log("\n--- Generated Registry ---\n");
    console.log(output);
    console.log(`\n--- ${registry.items.length} items ---`);
  } else {
    const outputPath = path.join(projectRoot, config.outputPath);
    fs.writeFileSync(outputPath, output + "\n");
    console.log(`Registry written to: ${outputPath}`);
    console.log(`Total items: ${registry.items.length}`);
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
