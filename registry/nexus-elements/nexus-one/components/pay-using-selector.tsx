import React from "react";
import { ChevronRight, Settings } from "lucide-react";

export interface PayUsingSelectorProps {
  label?: string; // "Pay using"
  sublabel?: string; // "Auto-selected based on amount" or "USDC, ETH"
  onClick?: () => void;
  disabled?: boolean;
}

export function PayUsingSelector({
  label = "Pay using",
  sublabel = "Auto-selected based on amount",
  onClick,
  disabled = false,
}: PayUsingSelectorProps) {
  return (
    <div className="w-full">
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full flex items-center justify-between p-4 border rounded-xl bg-[#F8F9FA] hover:bg-[#F0F2F5] transition-colors disabled:opacity-50 group text-left"
      >
        <div className="flex items-center gap-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border shrink-0 text-gray-500">
            <Settings className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 leading-none mb-1">
              {label}
            </span>
            <span className="text-xs text-gray-500 leading-none">
              {sublabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-x-1 text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
          <span>Edit</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
}
