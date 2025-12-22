interface AmountDisplayProps {
  amount: string;
  suffix: string;
  label: string;
}

export function AmountDisplay({ amount, suffix, label }: AmountDisplayProps) {
  return (
    <div className="flex flex-col gap-1.5 items-center">
      <div className="flex gap-1 items-end">
        <span className="font-display text-card-foreground text-[20px] tracking-[0.4px] font-medium">
          {amount}
        </span>
        <span className="text-card-foreground text-[13px] leading-4.5 font-sans mb-1">
          {suffix}
        </span>
      </div>
      <div className="text-muted-foreground text-sm leading-5 font-sans">
        {label}
      </div>
    </div>
  );
}
