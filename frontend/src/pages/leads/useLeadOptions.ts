import { useCallback } from "react";
import type { ServerMultiSelectLoadParams, ServerMultiSelectLoadResult } from "@/components/ui/server-multi-select";
import { getContactsPage, getListingsPage, getMembersPage } from "@/services/api";
import { LEAD_SOURCES } from "./leadConstants";
import { contactToOption, listingToOption, sourceToOption, userToOption } from "./leadUtils";
import type { AssigneeOption, ContactOption, ListingOption, SourceOption } from "./leadTypes";

export function useLeadOptions() {
  const loadContactOptions = useCallback(
    async ({ search, page, pageSize, signal }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<ContactOption>> => {
      const result = await getContactsPage(
        {
          page,
          pageSize,
          search,
          sort: { columnId: "contact", direction: "asc" },
        },
        { signal },
      );

      return {
        options: result.data.map(contactToOption),
        hasMore: result.page < result.pageCount,
      };
    },
    [],
  );

  const loadListingOptions = useCallback(
    async ({ search, page, pageSize, signal }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<ListingOption>> => {
      const result = await getListingsPage(
        {
          page,
          pageSize,
          search,
          sort: { columnId: "title", direction: "asc" },
        },
        { signal },
      );

      return {
        options: result.data.map(listingToOption),
        hasMore: result.page < result.pageCount,
      };
    },
    [],
  );

  const loadAssigneeOptions = useCallback(
    async ({ search, page, pageSize, signal }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<AssigneeOption>> => {
      const result = await getMembersPage(
        {
          page,
          pageSize,
          search,
          sort: { columnId: "name", direction: "asc" },
        },
        { signal },
      );

      return {
        options: result.data.map(userToOption),
        hasMore: result.page < result.pageCount,
      };
    },
    [],
  );

  const loadSourceOptions = useCallback(
    async ({ search, page, pageSize }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<SourceOption>> => {
      const normalizedSearch = search.trim().toLowerCase();
      const matchingOptions = LEAD_SOURCES.filter((source) => source.toLowerCase().includes(normalizedSearch)).map(sourceToOption);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      return {
        options: matchingOptions.slice(start, end),
        hasMore: end < matchingOptions.length,
      };
    },
    [],
  );

  return {
    loadAssigneeOptions,
    loadContactOptions,
    loadListingOptions,
    loadSourceOptions,
  };
}
