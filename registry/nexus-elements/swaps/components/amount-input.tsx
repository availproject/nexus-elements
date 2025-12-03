import { type FC, useEffect, useRef } from "react";

interface AmountInputProps {
  amount?: string;
  onChange?: (value: string) => void;
  onCommit?: (value: string) => void;
  disabled?: boolean;
}

const AmountInput: FC<AmountInputProps> = ({
  amount,
  onChange,
  onCommit,
  disabled,
}) => {
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const scheduleCommit = (val: string) => {
    if (!onCommit || disabled) return;
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      onCommit(val);
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative flex items-start gap-2 text-4xl font-medium transition-all duration-150 ease-out w-full">
      <div
        ref={mirrorRef}
        className="absolute invisible pointer-events-none text-4xl font-medium whitespace-pre"
        style={{
          fontVariantNumeric: "proportional-nums",
        }}
      >
        {amount || "0"}
      </div>

      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        placeholder="0"
        value={amount}
        onChange={(e) => {
          let next = e.target.value.replaceAll(/[^0-9.]/g, "");
          const parts = next.split(".");
          if (parts.length > 2) next = parts[0] + "." + parts.slice(1).join("");
          if (next === ".") next = "0.";
          onChange?.(next);
          scheduleCommit(next);
        }}
        autoFocus
        className="bg-transparent w-full text-foreground text-4xl font-medium outline-none transition-all duration-150 placeholder-muted-foreground proportional-nums disabled:opacity-80"
        disabled={disabled}
      />
      <div className="absolute -inset-1 -z-10 blur-sm pointer-events-none opacity-0" />
    </div>
  );
};

export default AmountInput;
