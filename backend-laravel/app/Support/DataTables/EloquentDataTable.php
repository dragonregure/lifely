<?php

namespace App\Support\DataTables;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

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
        $tieBreakerSort ??= self::qualifiedKeyName($query);

        $query->orderBy($sortColumn, $sortDirection);

        if ($tieBreakerSort !== null && $tieBreakerSort !== $sortColumn) {
            $query->orderBy($tieBreakerSort, $sortDirection);
        }

        return $query->paginate($dataTable->perPage, ['*'], 'page', $dataTable->page);
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
