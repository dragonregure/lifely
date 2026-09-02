<?php

namespace App\Support\DataTables;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use Illuminate\Support\Collection;
use Yajra\DataTables\Facades\DataTables;

final class EloquentDataTable
{
    /**
     * @param  Builder<*>  $query
     * @param  array<int, string>  $searchColumns
     * @param  array<string, string>  $filterColumns
     * @param  array<string, string>  $sortColumns
     */
    public static function paginate(
        Builder $query,
        DataTableQuery $dataTable,
        array $searchColumns,
        array $filterColumns,
        array $sortColumns,
        string $defaultSort = 'created_at',
        string $defaultDirection = 'desc',
        ?string $tieBreakerSort = null,
    ): LengthAwarePaginator {
        $request = request();
        $originalQuery = $request->query->all();
        $originalRequest = $request->request->all();
        $tieBreakerSort ??= self::qualifiedKeyName($query);

        try {
            self::replaceRequestInputForYajra($request, $dataTable);

            $yajraTable = DataTables::eloquent($query)
                ->filter(
                    fn (Builder $query): Builder => self::applyFilters($query, $dataTable, $searchColumns, $filterColumns),
                    false
                )
                ->order(
                    fn (Builder $query): Builder => self::applyOrdering(
                        $query,
                        $dataTable,
                        $sortColumns,
                        $defaultSort,
                        $defaultDirection,
                        $tieBreakerSort,
                    )
                );

            $yajraTable->prepareQuery();

            /** @var Collection<int, Model> $items */
            $items = $yajraTable->results();
            $total = $yajraTable->filteredCount();
        } finally {
            $request->query->replace($originalQuery);
            $request->request->replace($originalRequest);
        }

        return tap(
            new Paginator($items, $total, $dataTable->perPage, $dataTable->page, [
                'path' => $request->url(),
                'pageName' => 'page',
            ]),
            fn (Paginator $paginator) => $paginator->appends($originalQuery)
        );
    }

    private static function replaceRequestInputForYajra(Request $request, DataTableQuery $dataTable): void
    {
        $dataTablesInput = [
            'start' => ($dataTable->page - 1) * $dataTable->perPage,
            'length' => $dataTable->perPage,
            'columns' => [],
            'order' => [],
        ];

        if (in_array($request->getMethod(), ['GET', 'HEAD'], true)) {
            $request->query->replace($dataTablesInput);

            return;
        }

        $request->request->replace($dataTablesInput);
    }

    /**
     * @param  Builder<*>  $query
     * @param  array<int, string>  $searchColumns
     * @param  array<string, string>  $filterColumns
     */
    private static function applyFilters(
        Builder $query,
        DataTableQuery $dataTable,
        array $searchColumns,
        array $filterColumns,
    ): Builder {
        if ($dataTable->search !== null && $searchColumns !== []) {
            $query->where(function (Builder $query) use ($dataTable, $searchColumns): void {
                foreach ($searchColumns as $column) {
                    $query->orWhere($column, 'like', '%'.$dataTable->search.'%');
                }
            });
        }

        foreach ($filterColumns as $filter => $column) {
            $value = $dataTable->filter($filter);
            if ($value !== null) {
                $query->where($column, $value);
            }
        }

        return $query;
    }

    /**
     * @param  Builder<*>  $query
     * @param  array<string, string>  $sortColumns
     */
    private static function applyOrdering(
        Builder $query,
        DataTableQuery $dataTable,
        array $sortColumns,
        string $defaultSort,
        string $defaultDirection,
        ?string $tieBreakerSort,
    ): Builder {
        $hasRequestedSort = $dataTable->sort !== null && array_key_exists($dataTable->sort, $sortColumns);
        $sortColumn = $hasRequestedSort ? $sortColumns[$dataTable->sort] : $defaultSort;
        $sortDirection = $hasRequestedSort ? $dataTable->direction : $defaultDirection;

        $query->orderBy($sortColumn, $sortDirection);

        if ($tieBreakerSort !== null && $tieBreakerSort !== $sortColumn) {
            $query->orderBy($tieBreakerSort, $sortDirection);
        }

        return $query;
    }

    /**
     * @param  Builder<*>  $query
     */
    private static function qualifiedKeyName(Builder $query): ?string
    {
        $model = $query->getModel();

        if (! $model instanceof Model) {
            return null;
        }

        return $model->qualifyColumn($model->getKeyName());
    }
}
