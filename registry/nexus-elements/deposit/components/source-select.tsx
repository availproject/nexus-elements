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
}

const SourceSelect = ({ chainOptions }: SourceSelectProps) => {
  return (
    <Popover>
      <PopoverTrigger className="flex items-center justify-between w-full p-2 cursor-pointer">
        Customise Source Assests (Use Any){" "}
        <ChevronDown className="size-4 text-primary data-[state=open]:rotate-180 shrink-0 translate-y-0.5 transition-transform duration-200" />
      </PopoverTrigger>
      <PopoverContent className="grid grid-cols-2 w-max">
        {chainOptions ? (
          chainOptions?.map((chain) => {
            return (
              <div key={chain.id} className="flex items-center gap-x-2">
                <Checkbox value={chain.id} className="cursor-pointer" />
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
