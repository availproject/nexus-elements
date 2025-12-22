"use client";

import Image from "next/image";
import ButtonCard from "../components/button-card";
import { WalletIcon, RightChevronIcon, QrIcon, FiatIcon } from "./icons";
import { CardContent } from "./ui/card";
import WidgetHeader from "./widget-header";
import { DEPOSIT_WIDGET_ASSETS, MOCK_DEMO_VALUES } from "../constants";
import type { DepositWidgetContextValue } from "../types";

interface DepositOptionsContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

const DepositOptionsContainer = ({
  widget,
  onClose,
}: DepositOptionsContainerProps) => {
  return (
    <>
      <WidgetHeader title="Deposit USDC" onClose={onClose} />
      <CardContent>
        <div className="flex flex-col gap-4">
          <ButtonCard
            title="Wallet"
            subtitle={MOCK_DEMO_VALUES.totalWalletBalance}
            icon={
              <WalletIcon className="transition-colors text-card-foreground duration-200 group-hover/button-card:text-primary" />
            }
            rightIcon={
              <RightChevronIcon className="text-muted-foreground transition-colors duration-200 group-hover/button-card:text-primary" />
            }
            onClick={() => widget.goToStep("amount")}
          />
          <ButtonCard
            title="Transfer QR"
            subtitle="Coming soon"
            icon={<QrIcon className="w-8 h-8 text-muted-foreground" />}
            disabled
          />
          <ButtonCard
            title="Fiat"
            subtitle="Coming soon"
            icon={<FiatIcon className="w-8 h-8 text-muted-foreground" />}
            disabled
          />
        </div>
      </CardContent>
    </>
  );
};

export default DepositOptionsContainer;
