import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      outDir: "dist",
      include: ["src/**/*"],
    }),
  ],
  resolve: {
    alias: {
      "@registry": resolve(__dirname, "../../apps/docs/registry"),
      "@/registry": resolve(__dirname, "../../apps/docs/registry"),
      "@/lib": resolve(__dirname, "../../apps/docs/lib"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "unified-balance": resolve(__dirname, "src/unified-balance.ts"),
        "fast-bridge": resolve(__dirname, "src/fast-bridge.ts"),
        "fast-transfer": resolve(__dirname, "src/fast-transfer.ts"),
        deposit: resolve(__dirname, "src/deposit.ts"),
        swaps: resolve(__dirname, "src/swaps.ts"),
        "view-history": resolve(__dirname, "src/view-history.ts"),
      },
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        preserveModules: false,
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
});
