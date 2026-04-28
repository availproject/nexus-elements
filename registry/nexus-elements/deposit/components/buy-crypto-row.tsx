import ButtonCard from "./button-card";
import { FiatIcon, RightChevronIcon } from "./icons";

interface BuyCryptoRowProps {
  onClick?: () => void;
  amount?: string;
  minAmount?: number;
}

function BuyCryptoRow({ onClick, amount, minAmount }: BuyCryptoRowProps) {
  const amountNum = Number.parseFloat(amount ?? "0") || 0;
  const isBelowMin = minAmount != null && amountNum > 0 && amountNum < minAmount;

  const subtitle = isBelowMin ? (
    <span className="text-[13px] leading-4.5 text-amber-400 font-sans">
      Min ${minAmount} for fiat purchase
    </span>
  ) : null;

  return (
    <ButtonCard
      title="Buy crypto"
      subtitle={subtitle}
      icon={<FiatIcon className="w-5 h-5 text-muted-foreground" size={20} />}
      rightIcon={
        <RightChevronIcon
          size={20}
          className="text-muted-foreground transition-colors duration-200 group-hover/button-card:text-card-foreground"
        />
      }
      onClick={isBelowMin ? undefined : onClick}
      disabled={isBelowMin}
      roundedTop={false}
      roundedBottom={true}
    />
  );
}

export default BuyCryptoRow;
