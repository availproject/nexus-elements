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
}

export const DepositHeader = ({
  title,
  onBack,
  onClose,
  className,
  showBack = true,
  showClose = false,
  countdown,
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-xs text-muted-foreground">
            {countdown}
          </div>
        )}
      </div>
    </header>
  );
};

