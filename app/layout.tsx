import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import Topbar from "@/components/layout/top-bar";
import { Skeleton } from "@/registry/nexus-elements/ui/skeleton";
const Web3Provider = dynamic(() => import("@/providers/Web3Provider"), {
  loading: () => <Skeleton className="w-full h-full" />,
});

const inter = Inter({
  variable: "--font-serif",
  subsets: ["latin"],
});
const interMono = Inter({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexus Elements",
  description: "Prebuilt React components powered by Avail Nexus",
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
      <body className={`${inter.variable} ${interMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Web3Provider>
            <Topbar />
            {children}
          </Web3Provider>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
