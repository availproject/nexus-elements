import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import { Toaster } from "@/components/ui/sonner";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarSeparator,
  SidebarContent,
  SidebarInset,
} from "@/components/ui/sidebar";
import Topbar from "@/components/docs/top-bar";
import SidebarNav from "@/components/docs/sidebar-nav";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeProvider } from "next-themes";
const Web3Provider = dynamic(() => import("@/providers/Web3Provider"), {
  loading: () => <Skeleton className="w-full h-full" />,
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexus Elements",
  description: "Prebuilt React components built on top of Avail Nexus",
  authors: [{ name: "decocereus", url: "https://github.com/decocereus" }],
  icons: {
    icon: "/avail-fav.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Web3Provider>
            <SidebarProvider defaultOpen>
              <Sidebar
                variant="inset"
                collapsible="offcanvas"
                className="border-r"
              >
                <Link href={"/"} className="cursor-pointer">
                  <SidebarHeader className="px-3 py-2 h-12">
                    <Image
                      src="/avail-light-logo.svg"
                      alt="Nexus Elements"
                      width={100}
                      height={100}
                      className="hidden dark:block"
                    />
                    <Image
                      src="/avail-logo.svg"
                      alt="Nexus Elements"
                      width={100}
                      height={100}
                      className="block dark:hidden"
                    />
                  </SidebarHeader>
                </Link>

                <SidebarSeparator />
                <SidebarContent>
                  <SidebarNav />
                </SidebarContent>
              </Sidebar>

              <SidebarInset>
                <Topbar />
                <div className="p-4">{children}</div>
              </SidebarInset>
            </SidebarProvider>
          </Web3Provider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
