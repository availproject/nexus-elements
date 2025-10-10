import {
  type ReadableIntent,
  type SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";

interface SourceBreakdownProps {
  intent: ReadableIntent;
  tokenSymbol: SUPPORTED_TOKENS;
}

const SourceBreakdown = ({ intent, tokenSymbol }: SourceBreakdownProps) => {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="sources">
        <div className="flex items-start justify-between gap-x-4 w-full">
          {intent?.sources && (
            <>
              <div className="flex flex-col items-start gap-y-1 min-w-fit">
                <p className="text-base font-semibold">You Spend</p>
                <p className="text-sm font-medium">
                  {intent?.sources?.length > 1
                    ? `${intent?.sources?.length} assests on ${intent?.sources?.length} chains`
                    : `${intent?.sources?.length} asset on ${intent?.sources?.length} chain`}
                </p>
              </div>

              <div className="flex flex-col items-end gap-y-1 min-w-fit">
                <p className="text-base font-semibold">
                  {intent?.sourcesTotal} {tokenSymbol}
                </p>
                <AccordionTrigger
                  containerClassName="w-fit"
                  className="py-0 items-center gap-x-1"
                  hideChevron={false}
                >
                  <p className="text-sm font-medium">View Sources</p>
                </AccordionTrigger>
              </div>
            </>
          )}
        </div>
        {intent?.sources && (
          <AccordionContent className="my-4 bg-muted pb-0 px-4 py-2 rounded-lg w-full">
            <div className="flex flex-col items-center gap-y-3">
              {intent?.sources?.map((source) => (
                <div
                  key={source.chainID}
                  className="flex items-center justify-between w-full gap-x-2"
                >
                  <div className="flex items-center gap-x-2">
                    <img
                      src={source?.chainLogo}
                      alt={source?.chainName}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                    <p className="text-sm font-semibold">{source.chainName}</p>
                  </div>

                  <p className="text-sm font-semibold">
                    {source.amount} {tokenSymbol}
                  </p>
                </div>
              ))}
            </div>
          </AccordionContent>
        )}
      </AccordionItem>
    </Accordion>
  );
};

export default SourceBreakdown;
