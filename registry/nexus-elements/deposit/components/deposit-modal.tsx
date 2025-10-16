"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import Container from "./container";
import { BaseDepositProps } from "../deposit";

interface DepositModalProps extends BaseDepositProps {
  heading?: string;
}

const DepositModal = ({
  address,
  token,
  chain,
  chainOptions,
  heading,
}: DepositModalProps) => {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
        </DialogHeader>
        <Container
          address={address}
          token={token}
          chain={chain}
          chainOptions={chainOptions}
        />
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
