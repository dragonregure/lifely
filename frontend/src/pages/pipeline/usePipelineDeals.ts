import { useEffect, useMemo, useState } from "react";
import { getPipelineDealsPage } from "@/services/api";
import type { PipelineDeal } from "@/types";
import { PIPELINE_BOARD_INCLUDES, PIPELINE_PAGE_SIZE, PIPELINE_STAGES } from "./pipelineConstants";
import type { PipelineFilters } from "./pipelineTypes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

async function loadAllPipelineDeals(filters: PipelineFilters, signal: AbortSignal) {
  const assigneeFilter = filters.assignees.map((assignee) => assignee.value).join(",");
  const sourceFilter = filters.sources.map((source) => source.value).join(",");
  const firstPage = await getPipelineDealsPage(
    {
      page: 1,
      pageSize: PIPELINE_PAGE_SIZE,
      search: filters.search,
      filters: {
        user_id: assigneeFilter,
        source: sourceFilter,
      },
    },
    { include: PIPELINE_BOARD_INCLUDES, signal },
  );

  const deals = [...firstPage.data];

  for (let page = firstPage.page + 1; page <= firstPage.pageCount; page += 1) {
    if (signal.aborted) break;

    const nextPage = await getPipelineDealsPage(
      {
        page,
        pageSize: PIPELINE_PAGE_SIZE,
        search: filters.search,
        filters: {
          user_id: assigneeFilter,
          source: sourceFilter,
        },
      },
      { include: PIPELINE_BOARD_INCLUDES, signal },
    );

    deals.push(...nextPage.data);
  }

  return deals;
}

export function usePipelineDeals(filters: PipelineFilters) {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const assigneeFilter = useMemo(() => filters.assignees.map((assignee) => assignee.value).join(","), [filters.assignees]);
  const sourceFilter = useMemo(() => filters.sources.map((source) => source.value).join(","), [filters.sources]);
  const debouncedFilters = useMemo<PipelineFilters>(
    () => ({
      search: debouncedSearch,
      assignees: filters.assignees,
      sources: filters.sources,
    }),
    [debouncedSearch, filters.assignees, filters.sources],
  );

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    loadAllPipelineDeals(debouncedFilters, controller.signal)
      .then((result) => setDeals(result))
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Unable to load pipeline.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [assigneeFilter, debouncedFilters, sourceFilter]);

  const grouped = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      stage,
      deals: deals.filter((deal) => deal.stage === stage),
    }));
  }, [deals]);

  return {
    deals,
    error,
    grouped,
    isLoading,
    setDeals,
    setError,
  };
}
