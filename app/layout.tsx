import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeProvider } from "next-themes";
import Topbar from "@/components/layout/top-bar";
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
            <Topbar />
            {children}
          </Web3Provider>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
