"use client";

import { BaseDepositProps } from "../deposit";
import AmountInput from "./amount-input";
import SourceSelect from "./source-select";

interface SimpleDepositProps extends Omit<BaseDepositProps, "address"> {}

const SimpleDeposit = ({ token, chain, chainOptions }: SimpleDepositProps) => {
  return (
    <div className="flex flex-col items-center w-full border border-border">
      <SourceSelect chainOptions={chainOptions} />
      <AmountInput token={token} chain={chain} />
      <p>Simulation data</p>
    </div>
  );
};

export default SimpleDeposit;
