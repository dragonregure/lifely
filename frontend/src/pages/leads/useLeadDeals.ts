import { useCallback, useEffect, useMemo, useState } from "react";
import { getLeadDealsPage } from "@/services/api";
import type { LeadDeal } from "@/types";
import { LEAD_BOARD_INCLUDES, LEAD_PAGE_SIZE, LEAD_STAGES } from "./leadConstants";
import type { LeadFilters } from "./leadTypes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

async function loadAllLeadDeals(filters: LeadFilters, signal: AbortSignal) {
  const assigneeFilter = filters.assignees.map((assignee) => assignee.value).join(",");
  const sourceFilter = filters.sources.map((source) => source.value).join(",");
  const firstPage = await getLeadDealsPage(
    {
      page: 1,
      pageSize: LEAD_PAGE_SIZE,
      search: filters.search,
      filters: {
        user_id: assigneeFilter,
        source: sourceFilter,
      },
    },
    { include: LEAD_BOARD_INCLUDES, signal },
  );

  const deals = [...firstPage.data];

  for (let page = firstPage.page + 1; page <= firstPage.pageCount; page += 1) {
    if (signal.aborted) break;

    const nextPage = await getLeadDealsPage(
      {
        page,
        pageSize: LEAD_PAGE_SIZE,
        search: filters.search,
        filters: {
          user_id: assigneeFilter,
          source: sourceFilter,
        },
      },
      { include: LEAD_BOARD_INCLUDES, signal },
    );

    deals.push(...nextPage.data);
  }

  return deals;
}

export function useLeadDeals(filters: LeadFilters) {
  const [deals, setDeals] = useState<LeadDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const assigneeFilter = useMemo(() => filters.assignees.map((assignee) => assignee.value).join(","), [filters.assignees]);
  const sourceFilter = useMemo(() => filters.sources.map((source) => source.value).join(","), [filters.sources]);
  const debouncedFilters = useMemo<LeadFilters>(
    () => ({
      search: debouncedSearch,
      assignees: filters.assignees,
      sources: filters.sources,
    }),
    [debouncedSearch, filters.assignees, filters.sources],
  );

  const reloadDeals = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await loadAllLeadDeals(debouncedFilters, signal ?? new AbortController().signal);

        if (!signal?.aborted) {
          setDeals(result);
        }
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Unable to load leads.");
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [debouncedFilters],
  );

  useEffect(() => {
    const controller = new AbortController();

    void reloadDeals(controller.signal);

    return () => controller.abort();
  }, [assigneeFilter, reloadDeals, sourceFilter]);

  const grouped = useMemo(() => {
    return LEAD_STAGES.map((stage) => ({
      stage,
      deals: deals.filter((deal) => deal.stage === stage),
    }));
  }, [deals]);

  return {
    deals,
    error,
    grouped,
    isLoading,
    reloadDeals,
    setDeals,
    setError,
  };
}
