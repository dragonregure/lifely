import { useCallback, useEffect, useMemo, useState } from "react";
import { getLeadDealsPage } from "@/services/api";
import type { LeadDeal } from "@/types";
import { LEAD_BOARD_INCLUDES, LEAD_PIPELINE_COLUMN_PAGE_SIZE, LEAD_STAGES } from "./leadConstants";
import type { LeadFilters } from "./leadTypes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type LeadColumnMeta = {
  page: number;
  pageCount: number;
  total: number;
};

function emptyColumnMeta() {
  return LEAD_STAGES.reduce(
    (columns, stage) => ({
      ...columns,
      [stage]: { page: 1, pageCount: 1, total: 0 },
    }),
    {} as Record<(typeof LEAD_STAGES)[number], LeadColumnMeta>,
  );
}

async function loadLeadStagePage(filters: LeadFilters, stage: (typeof LEAD_STAGES)[number], page: number, signal?: AbortSignal) {
  const assigneeFilter = filters.assignees.map((assignee) => assignee.value).join(",");
  const sourceFilter = filters.sources.map((source) => source.value).join(",");

  return getLeadDealsPage(
    {
      page,
      pageSize: LEAD_PIPELINE_COLUMN_PAGE_SIZE,
      search: filters.search,
      filters: {
        is_active: "active",
        stage,
        user_id: assigneeFilter,
        source: sourceFilter,
      },
    },
    { include: LEAD_BOARD_INCLUDES, signal },
  );
}

export function useLeadDeals(filters: LeadFilters) {
  const [deals, setDeals] = useState<LeadDeal[]>([]);
  const [columnMeta, setColumnMeta] = useState(emptyColumnMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMoreStage, setLoadingMoreStage] = useState<(typeof LEAD_STAGES)[number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
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
        const stagePages = await Promise.all(LEAD_STAGES.map((stage) => loadLeadStagePage(debouncedFilters, stage, 1, signal)));

        if (!signal?.aborted) {
          setDeals(stagePages.flatMap((result) => result.data));
          setColumnMeta(
            LEAD_STAGES.reduce(
              (columns, stage, index) => ({
                ...columns,
                [stage]: {
                  page: stagePages[index].page,
                  pageCount: stagePages[index].pageCount,
                  total: stagePages[index].total,
                },
              }),
              emptyColumnMeta(),
            ),
          );
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

  const loadMoreStage = useCallback(
    async (stage: (typeof LEAD_STAGES)[number]) => {
      const meta = columnMeta[stage];

      if (loadingMoreStage || meta.page >= meta.pageCount) {
        return;
      }

      setLoadingMoreStage(stage);
      setError(null);

      try {
        const result = await loadLeadStagePage(debouncedFilters, stage, meta.page + 1);

        setDeals((current) => {
          const existingIds = new Set(current.map((deal) => deal.id));
          const nextDeals = result.data.filter((deal) => !existingIds.has(deal.id));

          return [...current, ...nextDeals];
        });
        setColumnMeta((current) => ({
          ...current,
          [stage]: {
            page: result.page,
            pageCount: result.pageCount,
            total: result.total,
          },
        }));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load more leads.");
      } finally {
        setLoadingMoreStage(null);
      }
    },
    [columnMeta, debouncedFilters, loadingMoreStage],
  );

  useEffect(() => {
    const controller = new AbortController();

    void reloadDeals(controller.signal);

    return () => controller.abort();
  }, [reloadDeals]);

  const grouped = useMemo(() => {
    return LEAD_STAGES.map((stage) => ({
      stage,
      deals: deals.filter((deal) => deal.stage === stage),
      page: columnMeta[stage].page,
      pageCount: columnMeta[stage].pageCount,
      total: Math.max(columnMeta[stage].total, deals.filter((deal) => deal.stage === stage).length),
    }));
  }, [columnMeta, deals]);

  return {
    deals,
    error,
    grouped,
    isLoading,
    loadingMoreStage,
    loadMoreStage,
    reloadDeals,
    setDeals,
    setError,
  };
}
