import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Pencil } from "lucide-react";
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

export type DetailDialogTab = {
  value: string;
  label: string;
  viewContent: ReactNode;
  editContent?: ReactNode;
  onSave?: () => void | Promise<void>;
};

type DetailDialogProps = {
  title: string;
  description?: string;
  trigger?: ReactNode;
  viewContent?: ReactNode;
  editContent?: ReactNode;
  editable?: boolean;
  tabs?: DetailDialogTab[];
  isSubmitting?: boolean;
  submitLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: () => void | Promise<void>;
};

export function DetailDialog({
  title,
  description,
  trigger,
  viewContent,
  editContent,
  editable = true,
  tabs,
  isSubmitting = false,
  submitLabel = "Save changes",
  open,
  onOpenChange,
  onSave,
}: DetailDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const firstTab = tabs?.[0]?.value ?? "";
  const [activeTab, setActiveTab] = useState(firstTab);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);

  useEffect(() => {
    if (firstTab && !tabs?.some((tab) => tab.value === activeTab)) {
      setActiveTab(firstTab);
    }
  }, [activeTab, firstTab, tabs]);

  const activeTabConfig = useMemo(() => tabs?.find((tab) => tab.value === activeTab), [activeTab, tabs]);
  const canEdit = editable && (tabs ? Boolean(activeTabConfig?.editContent) : Boolean(editContent));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (tabs) {
        await activeTabConfig?.onSave?.();
      } else {
        await onSave?.();
      }

      setIsEditing(false);
    } catch {
      // The owning page is responsible for showing the API error.
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        ref={contentRef}
        className="max-w-3xl"
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => contentRef.current?.focus());
        }}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
            {canEdit && (
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => setIsEditing((value) => !value)}
                aria-label={isEditing ? "Stop editing" : "Edit data"}
                title={isEditing ? "Stop editing" : "Edit data"}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {tabs ? (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="flex h-auto flex-wrap justify-start">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  {isEditing && activeTab === tab.value && tab.editContent ? tab.editContent : tab.viewContent}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div>{isEditing && editContent ? editContent : viewContent}</div>
          )}

          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting} loadingLabel={submitLabel}>{submitLabel}</Button>
              </>
            ) : (
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DialogClose>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
