import { InfoIcon } from "../icons";

interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="py-2 px-3 bg-destructive rounded-lg flex items-center gap-2 justify-center">
      <InfoIcon className="h-5 w-5 text-destructive-foreground flex-shrink-0" />
      <span className="font-sans text-[14px] leading-[22px] text-destructive-foreground">
        {message}
      </span>
    </div>
  );
}
