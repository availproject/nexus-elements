"use client";

import { Button } from "../../ui/button";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DepositHeaderProps {
  title: string;
  onBack?: () => void;
  onClose?: () => void;
  className?: string;
  showBack?: boolean;
  showClose?: boolean;
  countdown?: number;
  /** Total countdown duration for calculating progress (default: 15) */
  countdownTotal?: number;
}

interface CountdownRingProps {
  countdown: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

const CountdownRing = ({
  countdown,
  total,
  size = 36,
  strokeWidth = 2,
}: CountdownRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, countdown / total));
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-primary"
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      {/* Countdown number */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">
          {countdown}
        </span>
      </div>
    </div>
  );
};

export const DepositHeader = ({
  title,
  onBack,
  onClose,
  className,
  showBack = true,
  showClose = false,
  countdown,
  countdownTotal = 15,
}: DepositHeaderProps) => {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border",
        className
      )}
    >
      <div className="w-10">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-foreground hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
      </div>
      <h1 className="text-base font-semibold text-foreground text-center flex-1">
        {title}
      </h1>
      <div className="w-10 flex justify-end">
        {showClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {countdown !== undefined && (
          <CountdownRing countdown={countdown} total={countdownTotal} />
        )}
      </div>
    </header>
  );
};
