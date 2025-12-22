"use client";

import Image from "next/image";
import { CloseIcon, LeftChevronIcon } from "./icons";

interface WidgetHeaderProps {
  title: string;
  onBack?: () => void;
  onClose?: () => void;
}

const WidgetHeader = ({ title, onBack, onClose }: WidgetHeaderProps) => {
  return (
    <div className="flex items-center justify-between px-10">
      {onBack ? (
        <button
          onClick={onBack}
          className="h-5 w-5 flex items-center justify-center group"
        >
          <LeftChevronIcon className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
        </button>
      ) : (
        <Image
          src="/aave.svg"
          alt="Aave"
          width={20}
          height={20}
          className="h-5 w-5"
        />
      )}
      <h2 className="font-display text-center text-[15px] font-medium tracking-[0.3px]">
        {title}
      </h2>
      <button
        onClick={onClose}
        className="h-5 w-5 flex items-center justify-center group"
      >
        <CloseIcon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
    </div>
  );
};

export default WidgetHeader;
