import { TokenIcon } from "./token-icon";
import { ClockIcon } from "./icons";
import { DEPOSIT_WIDGET_ASSETS } from "../constants";

interface ReceiveAmountDisplayProps {
  label?: string;
  amount: string;
  timeLabel: string;
}

export function ReceiveAmountDisplay({
  label = "You receive",
  amount,
  timeLabel,
}: ReceiveAmountDisplayProps) {
  return (
    <div className="w-full flex flex-col items-center gap-2">
      <span className="font-sans text-sm leading-4.5 text-muted-foreground">
        {label}
      </span>
      <div className="w-full flex items-center justify-center gap-3">
        <TokenIcon
          tokenSrc={DEPOSIT_WIDGET_ASSETS.tokens.USDC}
          protocolSrc={DEPOSIT_WIDGET_ASSETS.protocols.aave}
          tokenAlt="USDC"
        />
        <h3 className="font-display text-[32px] tracking-[0.64px] font-medium">
          {amount}
        </h3>
      </div>
      <span className="font-sans flex gap-1 text-sm leading-4.5 text-muted-foreground mt-1">
        {timeLabel}
        <ClockIcon className="w-4 h-4" />
      </span>
    </div>
  );
}

