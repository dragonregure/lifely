import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CreateDialogTab = {
  value: string;
  label: string;
  content: ReactNode;
};

type CreateDialogProps = {
  title: string;
  description?: string;
  trigger?: ReactNode;
  children?: ReactNode;
  tabs?: CreateDialogTab[];
  submitLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CreateDialog({
  title,
  description,
  trigger,
  children,
  tabs,
  submitLabel = "Create",
  open,
  onOpenChange,
  onSubmit,
}: CreateDialogProps) {
  const firstTab = tabs?.[0]?.value ?? "";
  const [activeTab, setActiveTab] = useState(firstTab);

  useEffect(() => {
    if (open && firstTab) {
      setActiveTab(firstTab);
    }
  }, [firstTab, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit}>
          {tabs ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex h-auto flex-wrap justify-start">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            children
          )}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
