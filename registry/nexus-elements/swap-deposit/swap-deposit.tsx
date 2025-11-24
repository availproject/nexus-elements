import { type ExecuteParams } from "@avail-project/nexus-core";
import React from "react";
import { type Address } from "viem";

interface SwapDepositProps {
  executeDeposit: (
    tokenSymbol: string,
    tokenAddress: string,
    amount: bigint,
    chainId: number,
    user: Address
  ) => Omit<ExecuteParams, "toChainId">;
}

const SwapDeposit = ({ executeDeposit }: SwapDepositProps) => {
  return <div>Hello</div>;
};

export default SwapDeposit;
