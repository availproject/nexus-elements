import React from "react";
import Link from "next/link";
import { Button } from "@/registry/nexus-elements/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/nexus-elements/ui/card";
import { Separator } from "@/registry/nexus-elements/ui/separator";

export default function Home() {
  return (
    <main className="space-y-10">
      {/* Hero */}
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Nexus Elements
        </h1>
        <p className="text-foreground max-w-2xl">
          Production-ready React components powered by Avail Nexus. Install with
          a single command, theme with your design tokens, and ship faster with
          critical functionality already wired to the Nexus SDK.
        </p>
      </section>

      <Separator />

      {/* Benefits */}
      <section className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>One-command install</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Add any element via the shadcn CLI pointing at our registry. All
            required files and peer dependencies are installed automatically.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Themeable & composable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Built on shadcn/ui primitives. Drop into any design system and
            customize tokens, slots, and variants without vendor lock-in.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SDK-driven logic</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Elements ship with Nexus SDK integration out of the box (intent
            creation, progress, fees, simulation) so you focus on product.
          </CardContent>
        </Card>
      </section>

      {/* How to use this site */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How to use this site</h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Use the left sidebar to browse components. Each page shows a live
          Preview and the Code tab with copy-pasteable source and install
          commands. The provider setup is included so you can get started in
          minutes.
        </p>
      </section>

      {/* Component spotlights */}
      <section className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Fast Bridge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Bridge assets across chains with source breakdown, fee details,
              progress steps, and allowance flow. Intent-based and optimized for
              UX.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/components/fast-bridge">
              <Button size="sm" variant="secondary">
                Open Fast Bridge
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deposit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Deposit funds from anywhere in one flow. Simulates costs, supports
              execute only paths, and shows total/execute/bridge fees with clear
              confirmations.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/components/deposit">
              <Button size="sm" variant="secondary">
                Open Deposit
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unified Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Fetch and display token balances across supported chains,
              normalized to USD, and ready for product surfaces. Compatible with
              any design system.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/components/unified-balance">
              <Button size="sm" variant="secondary">
                Open Unified Balance
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
