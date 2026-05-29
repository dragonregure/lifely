<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Reference extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_INACTIVE = 'INACTIVE';
    public const GROUP_REFERENCE_TYPE = 'reference_type';

    protected $fillable = [
        'tenant_id',
        'group',
        'reference_key',
        'value',
        'type',
        'meta',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function getKeyAttribute(): string
    {
        return $this->reference_key;
    }

    public function getIsSystemAttribute(): bool
    {
        return $this->tenant_id === null;
    }

    public function scopeVisibleToTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where(function (Builder $query) use ($tenantId): void {
            $query->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
        });
    }
}
