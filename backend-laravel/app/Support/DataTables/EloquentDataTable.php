<?php

namespace App\Support\DataTables;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

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
    ): LengthAwarePaginator {
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

        $hasRequestedSort = $dataTable->sort !== null && array_key_exists($dataTable->sort, $sortColumns);
        $sortColumn = $hasRequestedSort ? $sortColumns[$dataTable->sort] : $defaultSort;
        $sortDirection = $hasRequestedSort ? $dataTable->direction : $defaultDirection;

        return $query
            ->orderBy($sortColumn, $sortDirection)
            ->paginate($dataTable->perPage, ['*'], 'page', $dataTable->page);
    }
}
