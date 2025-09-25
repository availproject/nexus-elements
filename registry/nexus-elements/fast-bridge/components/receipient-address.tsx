"use client";
import * as React from "react";
import { Input } from "../../ui/input";
import { Check, Edit } from "lucide-react";
import { Button } from "../../ui/button";
import { useNexus } from "../provider/NexusProvider";
import { ReceipientAddressProps } from "../types";

const ReceipientAddress: React.FC<ReceipientAddressProps> = ({
  address,
  onChange,
}) => {
  const { nexusSDK } = useNexus();
  const [isEditing, setIsEditing] = React.useState(false);
  return (
    <div className="w-full">
      {isEditing ? (
        <div className="flex items-center w-full justify-between gap-x-4">
          <Input
            value={address}
            placeholder="Enter Recipient Address"
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
          />
          <Button
            variant={"ghost"}
            size={"icon"}
            onClick={() => {
              setIsEditing(false);
            }}
          >
            <Check className="size-5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center w-full justify-between">
          <p className="font-semibold">Recipient Address</p>
          <div className="flex items-center gap-x-3 ">
            <p className="font-semibold">
              {nexusSDK?.utils?.truncateAddress(address ?? "", 6, 6)}
            </p>

            <Button
              variant={"ghost"}
              size={"icon"}
              onClick={() => {
                setIsEditing(true);
              }}
              className="px-0 size-6"
            >
              <Edit className="size-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceipientAddress;
