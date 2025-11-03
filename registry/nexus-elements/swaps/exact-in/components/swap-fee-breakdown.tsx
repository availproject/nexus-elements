import React from "react";

interface SwapFeeBreakdownProps {
  isLoading?: boolean;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const SwapFeeBreakdown: React.FC<SwapFeeBreakdownProps> = ({ isLoading }) => {
  const dash = "—";
  return (
    <div className="w-full border rounded-md p-3">
      <p className="text-sm font-semibold mb-2">Fees</p>
      <div className="flex flex-col gap-y-2">
        <Row label="Source swap" value={dash} />
        <Row label="Destination execution" value={dash} />
        <div className="h-px bg-border" />
        <Row label="Total" value={dash} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Fee estimates are not available pre-execution.
      </p>
    </div>
  );
};

export default SwapFeeBreakdown;
