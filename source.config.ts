import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import rehypePrettyCode from "rehype-pretty-code";

export default defineConfig({
  mdxOptions: {
    rehypePlugins: (plugins) => {
      // Replace default highlighter with rehype-pretty-code + Shiki themes
      if (plugins.length > 0) {
        plugins.shift();
      }
      plugins.push([
        rehypePrettyCode as any,
        { theme: { dark: "github-dark", light: "github-light-default" } },
      ]);
      return plugins;
    },
  },
});

export const docs = defineDocs({ dir: "content/docs" });


