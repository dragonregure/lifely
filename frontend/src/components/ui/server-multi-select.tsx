import * as React from "react";
import { AlertCircle, Check, ChevronDown, Search, X } from "lucide-react";
import { LoadingSpinner } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ServerMultiSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type ServerMultiSelectLoadParams = {
  search: string;
  page: number;
  pageSize: number;
  signal: AbortSignal;
};

export type ServerMultiSelectLoadResult<TOption extends ServerMultiSelectOption = ServerMultiSelectOption> = {
  options: TOption[];
  hasMore?: boolean;
};

export type ServerMultiSelectProps<TOption extends ServerMultiSelectOption = ServerMultiSelectOption> = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> & {
  value: TOption[];
  onChange: (value: TOption[]) => void;
  loadOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<TOption>>;
  id?: string;
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  loadingLabel?: string;
  errorLabel?: string;
  disabled?: boolean;
  debounceMs?: number;
  minSearchLength?: number;
  pageSize?: number;
  maxSelected?: number;
};

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_DEBOUNCE_MS = 300;

function useDebouncedValue<TValue>(value: TValue, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

function firstEnabledIndex<TOption extends ServerMultiSelectOption>(
  options: TOption[],
  isDisabled: (option: TOption) => boolean,
) {
  return options.findIndex((option) => !isDisabled(option));
}

function nextEnabledIndex<TOption extends ServerMultiSelectOption>(
  options: TOption[],
  currentIndex: number,
  direction: 1 | -1,
  isDisabled: (option: TOption) => boolean,
) {
  if (options.length === 0) return -1;

  for (let offset = 1; offset <= options.length; offset += 1) {
    const nextIndex = (currentIndex + offset * direction + options.length) % options.length;
    if (!isDisabled(options[nextIndex])) {
      return nextIndex;
    }
  }

  return -1;
}

export function ServerMultiSelect<TOption extends ServerMultiSelectOption = ServerMultiSelectOption>({
  value,
  onChange,
  loadOptions,
  id,
  name,
  placeholder = "Select options",
  searchPlaceholder = "Search options...",
  emptyLabel = "No options found.",
  loadingLabel = "Loading options",
  errorLabel = "Could not load options.",
  disabled = false,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  minSearchLength = 0,
  pageSize = DEFAULT_PAGE_SIZE,
  maxSelected,
  className,
  onBlur,
  onFocus,
  ...props
}: ServerMultiSelectProps<TOption>) {
  const generatedId = React.useId();
  const controlId = id ?? generatedId;
  const listboxId = `${controlId}-listbox`;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [options, setOptions] = React.useState<TOption[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const debouncedSearch = useDebouncedValue(search, debounceMs).trim();
  const selectedValues = React.useMemo(() => new Set(value.map((option) => option.value)), [value]);
  const canSearch = debouncedSearch.length >= minSearchLength;

  const isOptionDisabled = React.useCallback(
    (option: TOption) => {
      const isSelected = selectedValues.has(option.value);
      return Boolean(option.disabled) || (!isSelected && maxSelected !== undefined && value.length >= maxSelected);
    },
    [maxSelected, selectedValues, value.length],
  );

  const openMenu = React.useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled]);

  const closeMenu = React.useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [closeMenu, isOpen]);

  React.useEffect(() => {
    if (!isOpen || !canSearch) {
      setOptions([]);
      setHasMore(false);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setPage(1);

    loadOptions({
      search: debouncedSearch,
      page: 1,
      pageSize,
      signal: controller.signal,
    })
      .then((result) => {
        setOptions(result.options);
        setHasMore(Boolean(result.hasMore));
        setHighlightedIndex(firstEnabledIndex(result.options, isOptionDisabled));
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;

        setOptions([]);
        setHasMore(false);
        setError(loadError instanceof Error ? loadError.message : errorLabel);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [canSearch, debouncedSearch, errorLabel, isOpen, isOptionDisabled, loadOptions, pageSize]);

  React.useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const removeOption = React.useCallback(
    (optionValue: string) => {
      onChange(value.filter((option) => option.value !== optionValue));
    },
    [onChange, value],
  );

  const toggleOption = React.useCallback(
    (option: TOption) => {
      if (isOptionDisabled(option)) return;

      if (selectedValues.has(option.value)) {
        removeOption(option.value);
      } else {
        onChange([...value, option]);
      }

      setSearch("");
      if (maxSelected === 1) {
        closeMenu();
      } else {
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    [closeMenu, isOptionDisabled, maxSelected, onChange, removeOption, selectedValues, value],
  );

  const loadNextPage = React.useCallback(async () => {
    const controller = new AbortController();
    const nextPage = page + 1;

    setIsLoadingMore(true);
    setError(null);

    try {
      const result = await loadOptions({
        search: debouncedSearch,
        page: nextPage,
        pageSize,
        signal: controller.signal,
      });

      setOptions((current) => {
        const existingValues = new Set(current.map((option) => option.value));
        const nextOptions = result.options.filter((option) => !existingValues.has(option.value));
        return [...current, ...nextOptions];
      });
      setPage(nextPage);
      setHasMore(Boolean(result.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : errorLabel);
    } finally {
      setIsLoadingMore(false);
    }
  }, [debouncedSearch, errorLabel, loadOptions, page, pageSize]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      closeMenu();
      return;
    }

    if (event.key === "Backspace" && search.length === 0 && value.length > 0) {
      removeOption(value[value.length - 1].value);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu();
      setHighlightedIndex((currentIndex) => nextEnabledIndex(options, currentIndex, 1, isOptionDisabled));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((currentIndex) => nextEnabledIndex(options, currentIndex, -1, isOptionDisabled));
      return;
    }

    if (event.key === "Enter" && highlightedIndex >= 0 && options[highlightedIndex]) {
      event.preventDefault();
      toggleOption(options[highlightedIndex]);
    }
  };

  const shortSearchMessage =
    minSearchLength > 0 ? `Type at least ${minSearchLength} characters to search.` : "Start typing to search.";

  return (
    <div ref={containerRef} className={cn("relative", className)} {...props}>
      {name
        ? value.map((option) => <input key={option.value} type="hidden" name={name} value={option.value} />)
        : null}
      <div
        aria-controls={listboxId}
        aria-disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex min-h-10 w-full items-center gap-2 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background transition-colors",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={() => {
          openMenu();
          inputRef.current?.focus();
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        role="combobox"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {value.map((option) => (
            <span
              key={option.value}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
            >
              <span className="truncate">{option.label}</span>
              <button
                type="button"
                className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  removeOption(option.value);
                }}
                onMouseDown={(event) => event.preventDefault()}
                aria-label={`Remove ${option.label}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
          <div className="flex min-w-32 flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              disabled={disabled}
              id={controlId}
              placeholder={value.length > 0 ? searchPlaceholder : placeholder}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                openMenu();
              }}
              onFocus={openMenu}
              onKeyDown={handleInputKeyDown}
            />
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
      </div>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-md border bg-white text-foreground shadow-lg"
        >
          {!canSearch && <div className="px-3 py-2 text-sm text-muted-foreground">{shortSearchMessage}</div>}

          {canSearch && isLoading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <LoadingSpinner label={loadingLabel} />
              {loadingLabel}
            </div>
          )}

          {canSearch && error && !isLoading && (
            <div className="space-y-2 px-3 py-3">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span>{errorLabel}</span>
              </div>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          )}

          {canSearch && !isLoading && !error && options.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</div>}

          {canSearch && !isLoading && !error && options.length > 0 && (
            <div className="max-h-56 overflow-y-auto p-1 scrollbar-thin">
              {options.map((option, index) => {
                const isSelected = selectedValues.has(option.value);
                const optionDisabled = isOptionDisabled(option);

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={optionDisabled}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none transition-colors",
                      highlightedIndex === index && "bg-secondary",
                      optionDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-secondary",
                    )}
                    onClick={() => toggleOption(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-white",
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{option.description}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {canSearch && !isLoading && !error && hasMore && (
            <div className="border-t p-2">
              <Button type="button" variant="outline" size="sm" className="w-full" isLoading={isLoadingMore} loadingLabel="Loading more options" onClick={loadNextPage}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
