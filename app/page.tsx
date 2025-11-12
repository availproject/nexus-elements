"use client";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/registry/nexus-elements/ui/tabs";
import Topbar from "@/components/docs/top-bar";

export default function Home() {
  return (
    <>
      <Topbar />
      <main className="p-6 lg:p-8 max-w-7xl mx-auto space-y-12">
      {/* Hero Section */}
      <section className="flex flex-col gap-6 py-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            The Foundation for your Design System
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            A set of beautifully designed components that you can customize, extend, and build on. Start here then make it your own. Open Source. Open Code.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/docs/get-started">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/#components">
            <Button size="lg" variant="outline">View Components</Button>
          </Link>
        </div>
      </section>

      {/* Tabbed Navigation */}
      <section>
        <Tabs defaultValue="examples" className="w-full">
          <TabsList>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="playground">Playground</TabsTrigger>
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
          </TabsList>
          <TabsContent value="examples" className="mt-6">
            <div className="grid md:grid-cols-3 gap-4">
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
            </div>
          </TabsContent>
          <TabsContent value="dashboard" className="mt-6">
            <p className="text-muted-foreground">Dashboard examples coming soon...</p>
          </TabsContent>
          <TabsContent value="tasks" className="mt-6">
            <p className="text-muted-foreground">Tasks examples coming soon...</p>
          </TabsContent>
          <TabsContent value="playground" className="mt-6">
            <p className="text-muted-foreground">Playground coming soon...</p>
          </TabsContent>
          <TabsContent value="authentication" className="mt-6">
            <p className="text-muted-foreground">Authentication examples coming soon...</p>
          </TabsContent>
        </Tabs>
      </section>

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

      {/* Component spotlights */}
      <section id="components" className="space-y-4">
        <h2 className="text-2xl font-semibold">Components</h2>
        <p className="text-muted-foreground">
          Browse our collection of production-ready components powered by Avail Nexus.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
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
              <CardTitle>Swaps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Swap tokens across chains with support for exact input and exact output modes.
                Includes fee breakdown and transaction progress tracking.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/components/swaps">
                <Button size="sm" variant="secondary">
                  Open Swaps
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
        </div>
      </section>
      </main>
    </>
  );
}
