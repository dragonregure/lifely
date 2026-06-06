import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ServerMultiSelect, type ServerMultiSelectLoadParams, type ServerMultiSelectLoadResult } from "@/components/ui/server-multi-select";
import { activeFilterCount } from "./pipelineUtils";
import type { AssigneeOption, PipelineFilters, SourceOption } from "./pipelineTypes";

type PipelineFiltersMenuProps = {
  filters: PipelineFilters;
  onChange: (filters: PipelineFilters) => void;
  loadAssigneeOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<AssigneeOption>>;
  loadSourceOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<SourceOption>>;
};

export function PipelineFiltersMenu({ filters, onChange, loadAssigneeOptions, loadSourceOptions }: PipelineFiltersMenuProps) {
  const count = activeFilterCount(filters);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" aria-label="Open pipeline filters">
          <SlidersHorizontal className="h-4 w-4" />
          Filters{count > 0 ? ` (${count})` : ""}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pipeline-filter-assignee">Assignee</Label>
            <ServerMultiSelect<AssigneeOption>
              id="pipeline-filter-assignee"
              value={filters.assignees}
              onChange={(assignees) => onChange({ ...filters, assignees })}
              loadOptions={loadAssigneeOptions}
              placeholder="Select assignees"
              searchPlaceholder="Search users..."
              emptyLabel="No users found."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pipeline-filter-source">Source</Label>
            <ServerMultiSelect<SourceOption>
              id="pipeline-filter-source"
              value={filters.sources}
              onChange={(sources) => onChange({ ...filters, sources })}
              loadOptions={loadSourceOptions}
              placeholder="Select sources"
              searchPlaceholder="Search sources..."
              emptyLabel="No sources found."
            />
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" disabled={count === 0} onClick={() => onChange({ ...filters, assignees: [], sources: [] })}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
