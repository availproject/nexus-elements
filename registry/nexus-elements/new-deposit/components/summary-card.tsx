import { ChevronDownIcon } from "./icons";

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: string;
  valueSuffix?: string;
  showBreakdown?: boolean;
}

function SummaryCard({
  icon,
  title,
  subtitle,
  value,
  valueSuffix,
  showBreakdown,
}: SummaryCardProps) {
  return (
    <div className="flex justify-between border-t border-border py-5">
      <div className="flex gap-4 items-center">
        {icon}
        <div className="flex-col flex gap-2">
          <span className="font-sans text-sm leading-4.5 text-card-foreground">
            {title}
          </span>
          <span className="font-sans text-[13px] leading-4.5 text-muted-foreground">
            {subtitle}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 items-end">
        <div className="flex gap-1 items-end">
          <span className="font-display text-card-foreground tracking-[0.36px] leading-4.5 font-medium">
            {value}
          </span>
          {valueSuffix && (
            <span className="text-muted-foreground text-[13px] leading-4.5">
              {valueSuffix}
            </span>
          )}
        </div>
        {showBreakdown && (
          <div className="flex gap-0.5 cursor-pointer">
            <span className="font-sans text-[13px] underline leading-4.5 text-muted-foreground">
              view breakdown
            </span>
            <ChevronDownIcon size={16} className="text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

export default SummaryCard;
