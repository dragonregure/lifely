<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailCampaign extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'subject',
        'body',
        'contact_ids',
        'recipient_count',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'contact_ids' => 'array',
        ];
    }
}
