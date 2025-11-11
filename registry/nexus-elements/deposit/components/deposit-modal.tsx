"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import Container from "./container";
import { type BaseDepositProps } from "../deposit";
import { Button } from "../../ui/button";

interface DepositModalProps extends BaseDepositProps {
  heading?: string;
  destinationLabel?: string;
}

const DepositModal = ({
  address,
  token,
  chain,
  chainOptions,
  heading,
  destinationLabel,
  depositExecute,
}: DepositModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Deposit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
        </DialogHeader>
        <Container
          address={address}
          token={token}
          chain={chain}
          chainOptions={chainOptions}
          destinationLabel={destinationLabel}
          depositExecute={depositExecute}
        />
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
