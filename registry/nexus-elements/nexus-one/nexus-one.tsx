"use client";

import React, { useState } from "react";
import { type NexusOneProps, type NexusOneMode } from "./types";
import { AmountInputUnified } from "./components/amount-input-unified";
import { PayUsingSelector } from "./components/pay-using-selector";
import { StatusAlert } from "./components/status-alerts";
import { X } from "lucide-react";
import { Button } from "../ui/button";

export function NexusOne({ config, connectedAddress, onComplete, onStart, onError }: NexusOneProps) {
  // Determine initial mode based on config array or single choice
  const initialMode = Array.isArray(config.mode) ? config.mode[0] : config.mode;
  const [activeMode, setActiveMode] = useState<NexusOneMode>(initialMode);
  
  const [amount, setAmount] = useState("");
  const [txError, setTxError] = useState<string | null>(null);

  // Mocking title based on modes for the unified modal display
  const getTitle = () => {
    switch (activeMode) {
      case "deposit": return "Deposit USDC";
      case "swap": return "Swap Assets";
      case "transfer": return "Send assets";
      case "bridge": return "Bridge Assets";
      default: return "Nexus One";
    }
  };

  const handleContinue = () => {
    onStart?.();
    // This is where we would map into `useBridge`, `useSwaps`, or `useDeposit` logic.
    // For now, it represents the continuation into the execution flow.
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl border shadow-sm relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600">
          <div className="w-4 h-4 rounded-full border-2 border-current" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">{getTitle()}</h2>
        <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Amount Input */}
        <AmountInputUnified
          amount={amount}
          onChange={setAmount}
          maxAvailableAmount="3259.37" // Mock for UI wrapper testing
          // bridgableBalance={{...}}
          usdValue={amount ? (Number(amount) * 1).toFixed(2) : undefined} 
        />

        {/* Global/Standard Errors */}
        {txError && (
          <StatusAlert type="error" message={txError} />
        )}

        {/* Action button */}
        <div className="w-full pt-2">
          {activeMode === "swap" ? (
             <div className="text-sm border p-3 rounded-lg mb-4 text-center cursor-pointer text-gray-500 hover:bg-gray-50">
               Click to configure Swap Destination (Figma Screen 9)
             </div>
          ) : activeMode === "deposit" ? (
             <div className="mb-2">
               <PayUsingSelector 
                 onClick={() => { console.log("Open Pay Using Settings") }}
               />
             </div>
          ) : null}

          <Button onClick={handleContinue} className="w-full py-6 text-base font-medium rounded-xl btn-primary">
            {activeMode === "deposit" ? "Continue" :
             activeMode === "swap" ? "Proceed to Swap" : 
             activeMode === "transfer" ? "Proceed to Transfer" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NexusOne;
