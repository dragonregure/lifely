import type { DataTableQueryState } from "@/components/data-table";

export type PaginatedResult<T> = {
  data: T[];
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

export type ServerDataTableParams = Partial<DataTableQueryState>;

export function toQueryString(params: ServerDataTableParams = {}) {
  const query = new URLSearchParams();

  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.pageSize ?? 15));

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.sort) {
    query.set("sort", params.sort.columnId);
    query.set("direction", params.sort.direction);
  }

  Object.entries(params.filters ?? {}).forEach(([key, value]) => {
    if (value && value !== "all") {
      query.set(`filter[${key}]`, value);
    }
  });

  return query.toString();
}
