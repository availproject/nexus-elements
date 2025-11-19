import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Label } from "../../ui/label";
import { Checkbox } from "../../ui/checkbox";

interface SourceSelectProps {
  chainOptions?: {
    id: number;
    name: string;
    logo: string;
  }[];
  selected?: number[];
  onChange?: (selected: number[]) => void;
  disabled?: boolean;
}

const SourceSelect = ({
  chainOptions,
  selected = [],
  onChange,
  disabled = false,
}: SourceSelectProps) => {
  const isSelected = (id: number) => selected?.includes(id);
  const toggle = (id: number) => {
    if (!onChange) return;
    if (disabled) return;
    if (isSelected(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };
  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        aria-disabled={disabled}
        className={`flex items-center justify-between w-full px-0 py-2 ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        Customise source chains
        <ChevronDown className="size-4 text-primary data-[state=open]:rotate-180 shrink-0 translate-y-0.5 transition-transform duration-200" />
      </PopoverTrigger>
      <PopoverContent className="grid grid-cols-1 sm:grid-cols-2 w-max overflow-y-scroll max-h-[300px]">
        {chainOptions ? (
          chainOptions?.map((chain) => {
            return (
              <div key={chain.id} className="flex items-center gap-x-2">
                <Checkbox
                  checked={isSelected(chain.id)}
                  onCheckedChange={() => toggle(chain.id)}
                  value={chain.id}
                  disabled={disabled}
                  className={`${
                    disabled ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                />
                <div className="flex items-center gap-x-2 p-2">
                  <img
                    src={chain.logo}
                    alt={chain?.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <Label
                    className="text-primary test-sm"
                    htmlFor={String(chain.id)}
                  >
                    {chain.name}
                  </Label>
                </div>
              </div>
            );
          })
        ) : (
          <p>No option available</p>
        )}
      </PopoverContent>
    </Popover>
  );
};
export default SourceSelect;
