import React from "react";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { LoaderPinwheel } from "lucide-react";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "in" | "out";
  fromAmount?: string;
  fromSymbol?: string;
  toAmount?: string;
  toSymbol?: string;
  canConfirm: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  onOpenChange,
  mode,
  fromAmount,
  fromSymbol,
  toAmount,
  toSymbol,
  canConfirm,
  loading,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="sr-only">
          <DialogTitle>Review</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-y-4">
          <p className="text-lg font-semibold">You&apos;re swapping</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Mode</span>
            <span className="text-sm font-medium">
              {mode === "in" ? "Exact In" : "Exact Out"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">From</span>
            <span className="text-sm font-semibold">
              {fromAmount || "—"} {fromSymbol || ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">To</span>
            <span className="text-sm font-semibold">
              {toAmount || "—"} {toSymbol || ""}
            </span>
          </div>
          <div className="flex items-center justify-end gap-x-2">
            <Button variant={"ghost"} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={loading || !canConfirm}>
              {loading ? (
                <LoaderPinwheel className="animate-spin size-5" />
              ) : (
                "Swap"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;


