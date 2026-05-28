import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AccessDenied() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Card className="max-w-md">
        <CardContent className="grid gap-3 p-6 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-amber-50 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-950">Access restricted</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your current role does not include permission to view this workspace area.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
