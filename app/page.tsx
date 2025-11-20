import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Terminal, Zap, Shield, Globe, Box } from "lucide-react";
import MockBridgeUI from "@/components/mock-bridge-ui";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-white selection:bg-white selection:text-primary font-sans">
      <main className="relative pt-32">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-size-[24px_24px] opacity-20 mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Hero Section */}
        <section className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 text-foreground">
              Componenets <br />
              you need to
              <br />
              scale your dapps
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              Used by some of the world&apos;s largest protocols, Nexus enables
              you to create{" "}
              <span className="text-foreground font-medium">
                high-quality financial applications
              </span>{" "}
              with the power of React components.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={"/docs/get-started"}>
                <Button
                  size="lg"
                  className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-medium"
                >
                  Get Started
                </Button>
              </Link>
              <Link href={"/docs/view-components"}>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground text-base font-medium"
                >
                  View Components
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground font-mono">
              <span>~</span>
              <span>
                npx shadcn@latest add
                https://elements.nexus.availproject.org/r/fast-bridge.json
              </span>
            </div>
          </div>

          {/* Code Preview / Feature Highlight */}
          <div className="max-w-6xl mx-auto mt-24 border border-border rounded-xl bg-card overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                fast-bridge-demo.tsx
              </div>
              <div className="w-16" /> {/* Spacer for centering */}
            </div>
            <div className="grid lg:grid-cols-2">
              <div className="p-12 border-r border-border bg-card flex items-center justify-center min-h-[500px]">
                <div className="w-full max-w-md">
                  <MockBridgeUI />
                </div>
              </div>
              <div className="p-0 bg-[#0d0d0d] overflow-hidden relative flex flex-col">
                <div className="absolute top-4 right-4 text-xs text-muted-foreground font-mono z-10">
                  TypeScript
                </div>
                <div className="flex-1 overflow-auto p-8">
                  <pre className="text-sm font-mono text-muted-foreground leading-relaxed">
                    <code>{`import { FastBridge } from '@nexus/elements'
import { useAccount } from 'wagmi'

export function BridgeInterface() {
  const { address } = useAccount()

  return (
    <div className="p-4">
      <FastBridge 
        connectedAddress={address}
        prefill={{
          token: 'USDC',
          chainId: 10,
          amount: '100',
        }}
        onComplete={(tx) => {
          console.log('Bridge successful:', tx)
        }}
      />
    </div>
  )
}`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-6 py-32 border-t border-zinc-900 mt-32">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              What&apos;s in Nexus?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Everything you need to build great financial products on the web.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Instant Transactions",
                desc: "Optimized for speed with optimistic UI updates and automatic gas estimation.",
              },
              {
                icon: Shield,
                title: "Type-Safe Contracts",
                desc: "End-to-end type safety for your smart contract interactions with full Wagmi support.",
              },
              {
                icon: Globe,
                title: "Multi-Chain Ready",
                desc: "Built-in support for all major EVM chains with unified balance aggregation.",
              },
              {
                icon: Box,
                title: "Composable UI",
                desc: "Headless components that give you full control over styling and behavior.",
              },
              {
                icon: Terminal,
                title: "CLI Automation",
                desc: "Scaffold new projects or add components with a single command.",
              },
              {
                icon: Check,
                title: "Production Tested",
                desc: "Used in production by leading DeFi protocols handling millions in volume.",
              },
            ].map((feature) => (
              <div
                key={feature.desc}
                className="group p-6 rounded-xl border border-border bg-card/20 hover:bg-card/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center mb-4 group-hover:border-border/70 transition-colors">
                  <feature.icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
