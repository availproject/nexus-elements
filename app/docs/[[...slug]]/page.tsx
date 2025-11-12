import Link from "next/link";
import { notFound } from "next/navigation";
import { findNeighbour } from "fumadocs-core/page-tree";
import { source } from "@/lib/source";
import { mdxComponents } from "@/components/mdx/mdx-components";
import { Button } from "@/registry/nexus-elements/ui/button";
import { CopyButton } from "@/components/docs/copy-button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const revalidate = false;
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    notFound();
  }
  const doc = page.data;
  const title = doc.title || "";
  const description = doc.description || "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5001";
  const url = new URL(page.url, baseUrl).toString();
  const ogParams = `title=${encodeURIComponent(
    title
  )}&description=${encodeURIComponent(description)}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url,
      images: [{ url: `/og?${ogParams}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: `/og?${ogParams}` }],
    },
  };
}

export default async function Page(props: {
  params: Promise<{ slug: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    notFound();
  }
  const doc = page.data;
  const MDX = doc.body;
  const neighbours = findNeighbour(source.pageTree, page.url);
  const raw = await page.data.getText("raw");

  return (
    <div className="flex items-stretch text-[1.05rem] sm:text-[15px] xl:w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-(--top-spacing) shrink-0" />
        <div className="mx-auto flex w-full max-w-4xl min-w-0 flex-1 flex-col gap-6 px-4 pb-6 md:px-0 lg:pb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight sm:text-3xl xl:text-4xl">
                {doc.title}
              </h1>
              <div className="bg-background/80 border-border/50 flex items-center gap-2 border-t px-6 py-4 backdrop-blur-sm sm:static sm:z-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:pt-1.5 sm:backdrop-blur-none">
                <CopyButton value={raw} customPosition="" />
                {neighbours.previous && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="ml-auto size-8 shadow-none md:size-7"
                    asChild
                  >
                    <Link href={neighbours.previous.url}>
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="size-4" />
                    </Link>
                  </Button>
                )}
                {neighbours.next && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-8 shadow-none md:size-7"
                    asChild
                  >
                    <Link href={neighbours.next.url}>
                      <span className="sr-only">Next</span>
                      <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            {doc.description ? (
              <p className="text-muted-foreground text-[1.05rem] sm:text-base">
                {doc.description}
              </p>
            ) : null}
          </div>

          <div className="w-full flex-1 *:data-[slot=alert]:first:mt-0">
            <MDX components={mdxComponents} />
          </div>
        </div>

        <div className="mx-auto hidden h-16 w-full max-w-4xl items-center gap-2 px-4 sm:flex md:px-0">
          {neighbours.previous && (
            <Button
              variant="secondary"
              size="sm"
              asChild
              className="shadow-none"
            >
              <Link href={neighbours.previous.url}>
                ← {neighbours.previous.name}
              </Link>
            </Button>
          )}
          {neighbours.next && (
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto shadow-none"
              asChild
            >
              <Link href={neighbours.next.url}>{neighbours.next.name} →</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
