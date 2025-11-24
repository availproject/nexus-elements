"use client";
import React from "react";
import SwapExactIn from "./exact-in/exact-in";
import SwapExactOut from "./exact-out/exact-out";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface SwapsProps {
  onComplete?: (amount?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  exactInprefill?: {
    fromChainID?: number;
    fromToken?: string;
    fromAmount?: string;
    toChainID?: number;
    toToken?: string;
  };
  exactOutprefill?: {
    toAmount?: string;
    toChainID?: number;
    toToken?: string;
  };
}

const Swaps = ({
  onComplete,
  onStart,
  onError,
  exactInprefill,
  exactOutprefill,
}: SwapsProps) => {
  return (
    <Tabs className="w-full" defaultValue={"exact-in"}>
      <TabsList>
        <TabsTrigger value="exact-int">
          <p className="text-sm font-medium">Exact In</p>
        </TabsTrigger>
        <TabsTrigger value="exact-out">
          <p className="text-sm font-medium">Exact Out</p>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="exact-in">
        <SwapExactIn
          onComplete={onComplete}
          onStart={onStart}
          onError={onError}
          prefill={exactInprefill}
        />
      </TabsContent>
      <TabsContent value="exact-out">
        <SwapExactOut
          onComplete={onComplete}
          onStart={onStart}
          onError={onError}
          prefill={exactOutprefill}
        />
      </TabsContent>
    </Tabs>
  );
};

export default Swaps;
