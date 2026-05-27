<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PipelineDeal extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'pipelines';

    protected $fillable = [
        'tenant_id',
        'contact_id',
        'listing_id',
        'user_id',
        'stage',
        'value',
        'next_task',
        'due_at',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'due_at' => 'datetime',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
