import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_FILTER_VALUE, DEFAULT_PAGE_SIZES } from "./constants";
import type { DataTableActions, DataTableColumn, DataTableProps, DataTableSearch, DataTableSortState } from "./types";
import { clampPageSize, compareSortValues, getAccessorValue, getColumnSortValue, isColumnSortable, toSearchText } from "./utils";

type UseDataTableProps<TData extends object> = Pick<
  DataTableProps<TData>,
  | "actions"
  | "actionsHeader"
  | "columns"
  | "data"
  | "filters"
  | "initialPageSize"
  | "initialSort"
  | "onQueryChange"
  | "pageSizeOptions"
  | "search"
  | "serverPageCount"
  | "serverSide"
  | "serverTotalRows"
  | "toolbarEnd"
>;

export function useDataTable<TData extends object>({
  actions,
  actionsHeader,
  columns,
  data,
  filters = [],
  initialSort,
  onQueryChange,
  initialPageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  search = false,
  serverPageCount,
  serverSide = false,
  serverTotalRows,
  toolbarEnd,
}: UseDataTableProps<TData>) {
  const normalizedPageSizeOptions = useMemo(() => {
    return Array.from(new Set([...pageSizeOptions, initialPageSize].map(clampPageSize))).sort((a, b) => a - b);
  }, [initialPageSize, pageSizeOptions]);

  const [pageSize, setPageSize] = useState(clampPageSize(initialPageSize));
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortState, setSortState] = useState<DataTableSortState | null>(initialSort ?? null);
  const requestControllerRef = useRef<AbortController | null>(null);

  const searchConfig: DataTableSearch<TData> = useMemo(() => (typeof search === "boolean" ? { enabled: search } : search), [search]);
  const searchEnabled = Boolean(searchConfig.enabled);
  const searchDebounceMs = searchConfig.debounceMs ?? 1000;
  const isSearchSettling = serverSide && searchEnabled && query !== debouncedQuery;
  const actionConfig: DataTableActions<TData> | null = useMemo(() => {
    if (!actions) return null;
    return typeof actions === "function" ? { cell: actions, header: actionsHeader } : actions;
  }, [actions, actionsHeader]);

  useEffect(() => {
    setFilterValues((current) => {
      const next = Object.fromEntries(filters.map((filter) => [filter.id, current[filter.id] ?? filter.defaultValue ?? ALL_FILTER_VALUE]));
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      const changed = currentKeys.length !== nextKeys.length || nextKeys.some((key) => current[key] !== next[key]);
      return changed ? next : current;
    });
  }, [filters]);

  useEffect(() => {
    setPage(1);
  }, [filterValues, pageSize, query, sortState]);

  useEffect(() => {
    if (!serverSide || !searchEnabled || searchDebounceMs <= 0) {
      setDebouncedQuery(query);
      return;
    }

    const timeoutId = window.setTimeout(() => setDebouncedQuery(query), searchDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [query, searchDebounceMs, searchEnabled, serverSide]);

  useEffect(() => {
    if (!serverSide) return;

    requestControllerRef.current?.abort();
  }, [query, serverSide]);

  useEffect(() => {
    if (!serverSide || isSearchSettling) return;

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    onQueryChange?.({
      page,
      pageSize,
      search: debouncedQuery,
      filters: filterValues,
      sort: sortState,
    }, {
      signal: controller.signal,
    });

    return () => {
      controller.abort();
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
    };
  }, [debouncedQuery, filterValues, isSearchSettling, onQueryChange, page, pageSize, serverSide, sortState]);

  useEffect(() => {
    return () => requestControllerRef.current?.abort();
  }, []);

  const filteredData = useMemo(() => {
    if (serverSide) {
      return data;
    }

    const normalizedQuery = query.trim().toLowerCase();

    return data.filter((row) => {
      const matchesSearch =
        !searchEnabled ||
        normalizedQuery.length === 0 ||
        (searchConfig.searchValue
          ? searchConfig.searchValue(row)
          : columns.map((column) => column.searchValue?.(row) ?? toSearchText(getAccessorValue(row, column.accessor))).join(" "))
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesFilters = filters.every((filter) => {
        const selectedValue = filterValues[filter.id] ?? filter.defaultValue ?? ALL_FILTER_VALUE;
        return selectedValue === ALL_FILTER_VALUE || filter.predicate(row, selectedValue);
      });

      return matchesSearch && matchesFilters;
    });
  }, [columns, data, filterValues, filters, query, searchConfig, searchEnabled, serverSide]);

  const sortedData = useMemo(() => {
    if (serverSide || !sortState) {
      return filteredData;
    }

    const column = columns.find((item) => item.id === sortState.columnId);

    if (!column || !isColumnSortable(column)) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) =>
      compareSortValues(getColumnSortValue(a, column), getColumnSortValue(b, column), sortState.direction),
    );
  }, [columns, filteredData, serverSide, sortState]);

  const handleSort = (column: DataTableColumn<TData>) => {
    if (!isColumnSortable(column)) return;

    setSortState((current) => {
      if (current?.columnId !== column.id) {
        return { columnId: column.id, direction: "asc" };
      }

      if (current.direction === "asc") {
        return { columnId: column.id, direction: "desc" };
      }

      return null;
    });
  };

  const totalRows = serverSide ? (serverTotalRows ?? sortedData.length) : sortedData.length;
  const pageCount = serverSide ? Math.max(1, serverPageCount ?? Math.ceil(totalRows / pageSize)) : Math.max(1, Math.ceil(sortedData.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    if (serverSide) {
      return sortedData;
    }

    return sortedData.slice(start, start + pageSize);
  }, [currentPage, sortedData, pageSize, serverSide]);

  return {
    actionConfig,
    currentPage,
    filterValues,
    filteredData,
    handleSort,
    hasPagination: totalRows > pageSize,
    hasToolbar: searchEnabled || filters.length > 0 || Boolean(toolbarEnd),
    normalizedPageSizeOptions,
    pageCount,
    pageSize,
    paginatedData,
    query,
    rangeEnd: Math.min(currentPage * pageSize, totalRows),
    rangeStart: totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1,
    searchConfig,
    searchEnabled,
    setFilterValues,
    setPage,
    setPageSize,
    setQuery,
    sortState,
    totalRows,
  };
}
