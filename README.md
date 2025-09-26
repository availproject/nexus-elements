# Nexus Elements

## Install Fast Bridge (shadcn)

You can install the `fast-bridge` component into any project using the shadcn CLI. Until our namespace is part of the CLI defaults, use one of the options below.

### Option A: Namespace mapping (recommended, one-time)

Add a registry mapping to your project's `components.json` so the CLI can resolve `@nexus-elements/*` without a URL:

```json
{
  "registries": {
    "@nexus-elements": "https://elements.nexus.availproject.org/r/{name}.json"
  }
}
```

Then install:

```bash
pnpm dlx shadcn@latest add @nexus-elements/fast-bridge
```

### Option B: Direct URL (zero setup)

```bash
pnpm dlx shadcn@latest add https://elements.nexus.availproject.org/r/fast-bridge.json
```

### Option C: Custom registry flag

```bash
pnpm dlx shadcn@latest add --registry https://elements.nexus.availproject.org/r/{name}.json fast-bridge
```

### Local development (install from localhost)

If you’re running this repo locally:

1. Start the dev server in this repo:

```bash
pnpm dev
```

2. In your target project’s `components.json`, map the namespace to localhost:

```json
{
  "registries": {
    "@nexus-elements": "http://localhost:3000/r/{name}.json"
  }
}
```

3. Install:

```bash
pnpm dlx shadcn@latest add @nexus-elements/fast-bridge
```

## Notes

- The CLI will install the necessary UI primitives and utilities listed as `registryDependencies`.
- If you prefer npm or yarn, replace the `pnpm dlx` command with the equivalent for your package manager.

## References

- shadcn Registry Getting Started: https://ui.shadcn.com/docs/registry/getting-started.md
- Namespaces: https://ui.shadcn.com/docs/registry/namespace.md
- Item schema: https://ui.shadcn.com/docs/registry/registry-item-json.md
