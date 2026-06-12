import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionContextValue = {
  collapsible: boolean;
  openValue: string;
  setOpenValue: (value: string) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<string | null>(null);

interface AccordionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  collapsible?: boolean;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  type?: "single";
  value?: string;
}

function Accordion({
  children,
  className,
  collapsible = false,
  defaultValue = "",
  onValueChange,
  value,
  ...props
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const openValue = value ?? internalValue;

  const setOpenValue = React.useCallback(
    (nextValue: string) => {
      const updatedValue = collapsible && nextValue === openValue ? "" : nextValue;

      if (value === undefined) {
        setInternalValue(updatedValue);
      }

      onValueChange?.(updatedValue);
    },
    [collapsible, onValueChange, openValue, value],
  );

  return (
    <AccordionContext.Provider value={{ collapsible, openValue, setOpenValue }}>
      <div className={cn("divide-y divide-border", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(({ children, className, value, ...props }, ref) => (
  <AccordionItemContext.Provider value={value}>
    <div ref={ref} className={cn("border-b", className)} {...props}>
      {children}
    </div>
  </AccordionItemContext.Provider>
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, className, ...props }, ref) => {
    const accordion = React.useContext(AccordionContext);
    const itemValue = React.useContext(AccordionItemContext);

    if (!accordion || !itemValue) {
      throw new Error("AccordionTrigger must be used inside AccordionItem.");
    }

    const isOpen = accordion.openValue === itemValue;

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
        )}
        onClick={() => accordion.setOpenValue(itemValue)}
        {...props}
      >
        <span>{children}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>
    );
  },
);
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => {
    const accordion = React.useContext(AccordionContext);
    const itemValue = React.useContext(AccordionItemContext);

    if (!accordion || !itemValue) {
      throw new Error("AccordionContent must be used inside AccordionItem.");
    }

    const isOpen = accordion.openValue === itemValue;

    return (
      <div ref={ref} hidden={!isOpen} className={cn("pb-4 text-sm leading-6 text-muted-foreground", className)} {...props}>
        {children}
      </div>
    );
  },
);
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
