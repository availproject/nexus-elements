"use client";
import React, { useState } from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import { NexusOne } from "@/registry/nexus-elements/nexus-one/nexus-one";
import { encodeFunctionData } from "viem";
import { useAccount } from "wagmi";
import { useModal } from "connectkit";

const AAVE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "onBehalfOf", type: "address" },
      { internalType: "uint16", name: "referralCode", type: "uint16" },
    ],
    name: "supply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const COMPOUND_ABI = [
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "supply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const FLUID_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "assets_", type: "uint256" },
      { internalType: "address", name: "receiver_", type: "address" },
    ],
    name: "deposit",
    outputs: [{ internalType: "uint256", name: "shares_", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const MYSTIC_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "onBehalf",
        type: "address",
      },
    ],
    name: "deposit",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const ZENTRA_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "asset",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "onBehalfOf",
        type: "address",
      },
      {
        internalType: "uint16",
        name: "referralCode",
        type: "uint16",
      },
    ],
    name: "supply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const OPPORTUNITIES = {
  // 1. Aave on Arbitrum (USDT)
  "aave-arb-usdt": {
    title: "Aave",
    protocol: "Aave",
    label: "Deposit USDT on Aave on Arbitrum",
    depositTargetLogo: "https://files.availproject.org/uploads/2026-04-16/aave.svg",
    chainId: 42161,
    tokenSymbol: "USDT",
    tokenAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as const,
    tokenDecimals: 6,
    tokenLogo: "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/tokens/usdt/logo.png",
    executeDeposit: (symbol: string, tokenAddress: `0x${string}`, amount: bigint, chainId: number, user: `0x${string}`) => ({
      to: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as const,
      data: encodeFunctionData({
        abi: AAVE_ABI,
        functionName: "supply",
        args: [tokenAddress, amount, user, 0],
      }),
      tokenApproval: {
        token: tokenAddress,
        amount,
        spender: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as const,
      },
    }),
  },

  // 2. Aave on Ethereum (GHO)
  "aave-eth-gho": {
    title: "Aave (Eth)",
    protocol: "Aave",
    label: "Deposit GHO on Aave on Ethereum",
    depositTargetLogo: "https://files.availproject.org/uploads/2026-04-16/aave.svg",
    chainId: 1,
    tokenSymbol: "GHO",
    tokenAddress: "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f" as const,
    tokenDecimals: 18,
    tokenLogo: "https://s2.coinmarketcap.com/static/img/coins/64x64/23508.png",
    executeDeposit: (symbol: string, tokenAddress: `0x${string}`, amount: bigint, chainId: number, user: `0x${string}`) => ({
      to: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" as const,
      data: encodeFunctionData({
        abi: AAVE_ABI,
        functionName: "supply",
        args: [tokenAddress, amount, user, 0],
      }),
      tokenApproval: {
        token: tokenAddress,
        amount,
        spender: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" as const,
      },
    }),
  },

  // 3. Compound on Polygon (USDT)
  "compound-pol-usdt": {
    title: "Compound",
    protocol: "Compound",
    label: "Deposit USDT on Compound on Polygon",
    depositTargetLogo: "https://files.availproject.org/uploads/2026-04-16/compound.svg",
    chainId: 137,
    tokenSymbol: "USDT",
    tokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as const,
    tokenDecimals: 6,
    tokenLogo: "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/tokens/usdt/logo.png",
    executeDeposit: (symbol: string, tokenAddress: `0x${string}`, amount: bigint, chainId: number, user: `0x${string}`) => ({
      to: "0xaeB318360f27748Acb200CE616E389A6C9409a07" as const,
      data: encodeFunctionData({
        abi: COMPOUND_ABI,
        functionName: "supply",
        args: [tokenAddress, amount],
      }),
      tokenApproval: {
        token: tokenAddress,
        amount,
        spender: "0xaeB318360f27748Acb200CE616E389A6C9409a07" as const,
      },
    }),
  },

  // 4. Fluid on Base (USDC)
  "fluid-base-usdc": {
    title: "Fluid",
    protocol: "Fluid",
    label: "Deposit USDC on Fluid on Base",
    depositTargetLogo: "https://fluid.instad.app/images/logo.png",
    chainId: 8453,
    tokenSymbol: "USDC",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
    tokenDecimals: 6,
    tokenLogo: "https://raw.githubusercontent.com/availproject/nexus-assets/refs/heads/main/tokens/usdc/logo.png",
    executeDeposit: (symbol: string, tokenAddress: `0x${string}`, amount: bigint, chainId: number, user: `0x${string}`) => ({
      to: "0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169" as const,
      data: encodeFunctionData({
        abi: FLUID_ABI,
        functionName: "deposit",
        args: [amount, user],
      }),
      tokenApproval: {
        token: tokenAddress,
        amount,
        spender: "0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169" as const,
      },
    }),
  },

  // 5. Mystic on Citrea (ctUSD)
  "mystic-citrea-ctusd": {
    title: "Mystic",
    protocol: "Mystic",
    label: "Deposit ctUSD on Mystic on Citrea",
    depositTargetLogo: "https://files.availproject.org/nexus-elements/mystic.png",
    chainId: 4114,
    tokenSymbol: "ctUSD",
    tokenAddress: "0x8D82c4E3c936C7B5724A382a9c5a4E6Eb7aB6d5D" as const,
    tokenDecimals: 18,
    tokenLogo: "https://files.availproject.org/nexus-elements/ctUSD.svg",
    executeDeposit: (symbol: string, tokenAddress: `0x${string}`, amount: bigint, chainId: number, user: `0x${string}`) => ({
      to: "0x72f8C254548839Fa1Db4156aE01d8C6ae5885EE4" as const,
      data: encodeFunctionData({
        abi: MYSTIC_ABI,
        functionName: "deposit",
        args: [amount, user],
      }),
      tokenApproval: {
        token: tokenAddress,
        amount,
        spender: "0x72f8C254548839Fa1Db4156aE01d8C6ae5885EE4" as const,
      },
    }),
  },

  // 6. Zentra on Citrea (wcBTC)
  "zentra-citrea-wcbtc": {
    title: "Zentra",
    protocol: "Zentra",
    label: "Deposit wcBTC on Zentra on Citrea",
    depositTargetLogo: "https://zentrafinance.gitbook.io/zentra/~gitbook/image?url=https%3A%2F%2F2899070418-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Forganizations%252F1jzW9aBSq190MuRJKgIj%252Fsites%252Fsite_2l6Ro%252Ficon%252Fb8adwB6RA7Y6VJH3vGjh%252FZentra%2520%284%29.png%3Falt%3Dmedia%26token%3D8aa44578-e817-4c2f-b20e-abd25827d4fe&width=32&dpr=3&quality=100&sign=d18163fe&sv=2",
    chainId: 4114,
    tokenSymbol: "wcBTC",
    tokenAddress: "0x3100000000000000000000000000000000000006" as const,
    tokenDecimals: 18,
    tokenLogo: "https://assets.coingecko.com/coins/images/102172843/standard/cBTC.png",
    executeDeposit: (symbol: string, tokenAddress: `0x${string}`, amount: bigint, chainId: number, user: `0x${string}`) => ({
      to: "0xfb7908150b738e7dB9862007c66C9eb7850706F5" as const,
      data: encodeFunctionData({
        abi: ZENTRA_ABI,
        functionName: "supply",
        args: [tokenAddress, amount, user, 0],
      }),
      tokenApproval: {
        token: tokenAddress,
        amount,
        spender: "0xfb7908150b738e7dB9862007c66C9eb7850706F5" as const,
      },
    }),
  },
} as const;

const NexusOneDepositShowcase = () => {
  const { address } = useAccount();
  const { setOpen } = useModal();
  const [selectedOpt, setSelectedOpt] = useState<keyof typeof OPPORTUNITIES>("aave-arb-usdt");
  const [isOpen, setIsOpen] = useState(false);

  const currentOpportunity = OPPORTUNITIES[selectedOpt];

  return (
    <ShowcaseWrapper
      type="nexus-one"
      connectLabel="Connect wallet to use Deposit"
    >
      <div className="flex flex-col gap-6 w-full items-center">
        {/* Custom Dropdown Selector */}
        <div className="w-full max-w-sm flex flex-col gap-1.5 relative">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Select Deposit Protocol
          </label>
          
          {/* Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-all shadow-sm"
          >
            <div className="flex items-center gap-2">
              {currentOpportunity.depositTargetLogo && (
                <img
                  src={currentOpportunity.depositTargetLogo}
                  alt={currentOpportunity.title}
                  className="w-5 h-5 rounded-full object-contain"
                />
              )}
              <span className="font-semibold text-sm">
                {currentOpportunity.protocol} - {currentOpportunity.tokenSymbol} (
                {currentOpportunity.chainId === 42161
                  ? "Arbitrum"
                  : currentOpportunity.chainId === 1
                  ? "Ethereum"
                  : currentOpportunity.chainId === 137
                  ? "Polygon"
                  : currentOpportunity.chainId === 8453
                  ? "Base"
                  : "Citrea"}
                )
              </span>
            </div>
            
            <svg
              className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <>
              {/* Click outside overlay */}
              <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
              
              <div className="absolute top-[68px] left-0 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-20 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-100">
                {Object.entries(OPPORTUNITIES).map(([key, opt]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedOpt(key as keyof typeof OPPORTUNITIES);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all ${
                      selectedOpt === key
                        ? "bg-zinc-50 dark:bg-zinc-800/80 font-medium text-blue-600 dark:text-blue-400"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {opt.depositTargetLogo && (
                        <img
                          src={opt.depositTargetLogo}
                          alt={opt.title}
                          className="w-5 h-5 rounded-full object-contain"
                        />
                      )}
                      <span>
                        {opt.protocol} - {opt.tokenSymbol} (
                        {opt.chainId === 42161
                          ? "Arbitrum"
                          : opt.chainId === 1
                          ? "Ethereum"
                          : opt.chainId === 137
                          ? "Polygon"
                          : opt.chainId === 8453
                          ? "Base"
                          : "Citrea"}
                        )
                      </span>
                    </div>

                    {selectedOpt === key && (
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div
          className="flex w-full justify-center"
          style={{
            alignItems: "flex-start",
          }}
        >
          <NexusOne
            key={selectedOpt}
            config={{
              mode: "deposit",
              deposit: OPPORTUNITIES[selectedOpt],
              onConnectWalletClick: () => setOpen(true),
            }}
            connectedAddress={address}
          />
        </div>
      </div>
    </ShowcaseWrapper>
  );
};

export default NexusOneDepositShowcase;
