import type { MDXComponents } from "mdx/types";
import { ComponentPreview } from "./component-preview";
import {
  CodeTabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  InstallCommand,
} from "./code-tabs";
import { ComponentSource } from "./component-source";
import { Steps, Step } from "./steps";
import { CodeSnippet } from "../showcase/code-snippet";
import { CliCommand } from "../showcase/cli-command";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Headings
    h1: ({ children }: { children: React.ReactNode }) => (
      <h1 className="text-4xl font-bold tracking-tight mt-8 mb-4">
        {children}
      </h1>
    ),
    h2: ({ children, id }: { children: React.ReactNode; id: string }) => (
      <h2
        id={id}
        className="text-2xl font-semibold tracking-tight mt-8 mb-4 scroll-m-20"
      >
        {children}
      </h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3 className="text-xl font-semibold tracking-tight mt-6 mb-3">
        {children}
      </h3>
    ),
    // Paragraphs
    p: ({ children }: { children: React.ReactNode }) => (
      <p className="text-foreground/70 leading-7 mb-4">{children}</p>
    ),
    // Lists
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul className="list-disc ml-6 mb-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <ol className="list-decimal ml-6 mb-4 space-y-2">{children}</ol>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li className="text-foreground/70">{children}</li>
    ),
    // Code blocks
    code: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className: string;
    }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            {children}
          </code>
        );
      }
      return <code className={className}>{children}</code>;
    },
    pre: ({ children }: { children: React.ReactNode }) => {
      return <div className="my-4">{children}</div>;
    },
    // Blockquote
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4">
        {children}
      </blockquote>
    ),
    // Links
    a: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a
        href={href}
        className="text-primary underline underline-offset-4 hover:text-primary/80"
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    ),
    // Horizontal rule
    hr: () => <hr className="my-8 border-border" />,
    // Custom components
    ComponentPreview,
    CodeTabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    ComponentSource,
    Steps,
    Step,
    CodeSnippet,
    CliCommand,
    InstallCommand,
    // Spread any additional components
    ...components,
  };
}
