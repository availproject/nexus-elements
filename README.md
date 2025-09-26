# Nexus Elements

## Install Fast Bridge (shadcn)

You can install the `fast-bridge` component into any project using the shadcn CLI via a direct URL.

### Direct URL (zero setup)

```bash
pnpm dlx shadcn@latest add https://elements.nexus.availproject.org/r/fast-bridge.json
```

### Custom registry flag

```bash
pnpm dlx shadcn@latest add --registry https://elements.nexus.availproject.org/r/{name}.json fast-bridge
```

### Local development (install from localhost)

If you’re running this repo locally:

1. Start the dev server in this repo:

```bash
pnpm dev
```

2. Install via direct URL:

```bash
pnpm dlx shadcn@latest add http://localhost:3000/r/fast-bridge.json
```

## Notes

- The CLI will install the necessary UI primitives and utilities listed as `registryDependencies`.
- If you prefer npm or yarn, replace the `pnpm dlx` command with the equivalent for your package manager.

## References

- shadcn Registry Getting Started: https://ui.shadcn.com/docs/registry/getting-started.md
- Item schema: https://ui.shadcn.com/docs/registry/registry-item-json.md
