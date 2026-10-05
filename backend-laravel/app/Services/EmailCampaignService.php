<?php

namespace App\Services;

use App\Contracts\ContactServiceInterface;
use App\Contracts\EmailCampaignRepositoryInterface;
use App\Contracts\EmailCampaignServiceInterface;
use App\Contracts\EmailSenderInterface;
use App\Contracts\ListingServiceInterface;
use App\Contracts\TenantServiceInterface;
use App\Jobs\SendCampaignEmailToContact;
use App\Jobs\SendBulkEmailCampaign;
use App\Models\EmailCampaign;
use App\Services\Email\DemoEmailLimiter;
use App\Support\DataTables\DataTableQuery;
use App\Support\Email\CampaignEmailRenderer;
use App\Support\Email\EmailAddress;
use App\Support\Email\EmailMessage;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EmailCampaignService implements EmailCampaignServiceInterface
{
    public function __construct(
        private readonly EmailCampaignRepositoryInterface $campaigns,
        private readonly ContactServiceInterface $contacts,
        private readonly ListingServiceInterface $listings,
        private readonly TenantServiceInterface $tenants,
        private readonly DemoEmailLimiter $demoEmailLimiter,
        private readonly EmailSenderInterface $emails,
        private readonly CampaignEmailRenderer $renderer,
    ) {
    }

    public function all(string $tenantId): Collection
    {
        return $this->campaigns->all($tenantId);
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return $this->campaigns->paginate($tenantId, $dataTable);
    }

    public function queue(string $tenantId, array $data): EmailCampaign
    {
        $contactIds = $this->recipientContactIds($tenantId, $data);
        $campaign = DB::transaction(function () use ($tenantId, $data, $contactIds): EmailCampaign {
            $this->demoEmailLimiter->reserve($tenantId, count($contactIds));

            return $this->campaigns->createQueued($tenantId, [
                'user_id' => $this->tenantUserId($tenantId, $data['user_id'] ?? null),
                'listing_id' => $this->tenantListingId($tenantId, $data['listing_id'] ?? null),
                'subject' => $data['subject'],
                'body' => $data['body'],
                'contact_ids' => $contactIds,
                'recipient_count' => count($contactIds),
                'status' => 'Queued',
            ]);
        });

        SendBulkEmailCampaign::dispatch($campaign->id);

        return $campaign;
    }

    public function processQueuedCampaign(string $campaignId, bool $sendSynchronously = false): void
    {
        $campaign = $this->campaigns->find($campaignId);

        if (! $campaign || $campaign->status !== 'Queued') {
            return;
        }

        $campaign = $this->campaigns->updateStatus($campaign, 'Sending');

        foreach ($this->campaignContactIds($campaign) as $contactId) {
            if ($sendSynchronously) {
                $this->sendCampaignContact($campaign->id, $contactId);

                continue;
            }

            SendCampaignEmailToContact::dispatch($campaign->id, $contactId);
        }

        $this->campaigns->updateStatus($campaign, 'Sent');
    }

    public function sendCampaignContact(string $campaignId, string $contactId): void
    {
        $campaign = $this->campaigns->find($campaignId);

        if (! $campaign || ! in_array($campaign->status, ['Sending', 'Sent'], true)) {
            return;
        }

        $contact = $this->contacts->find($campaign->tenant_id, $contactId);

        if (! $contact || $contact->email === '') {
            return;
        }

        $listing = $campaign->listing_id === null
            ? null
            : $this->listings->find($campaign->tenant_id, $campaign->listing_id);

        $this->emails->send(new EmailMessage(
            to: [new EmailAddress($contact->email, trim("{$contact->first_name} {$contact->last_name}"))],
            subject: $campaign->subject,
            html: $this->renderer->html($campaign, $listing),
            text: $this->renderer->text($campaign, $listing),
            headers: [
                'X-Lifely-Campaign-Id' => $campaign->id,
                DemoEmailLimiter::TENANT_HEADER => $campaign->tenant_id,
                DemoEmailLimiter::RESERVED_HEADER => 'true',
            ]
        ));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, string>
     */
    private function recipientContactIds(string $tenantId, array $data): array
    {
        if (($data['all_active_contacts'] ?? false) === true) {
            return $this->contacts->tenantContactIds(
                $tenantId,
                $this->stringList($data['included_contact_ids'] ?? []),
                true
            );
        }

        return $this->contacts->tenantContactIds($tenantId, $this->stringList($data['contact_ids'] ?? []));
    }

    private function tenantUserId(string $tenantId, mixed $userId): ?string
    {
        return is_string($userId) && $this->tenants->userBelongsToTenant($tenantId, $userId) ? $userId : null;
    }

    private function tenantListingId(string $tenantId, mixed $listingId): ?string
    {
        return is_string($listingId) && $this->listings->listingsBelongToTenant($tenantId, [$listingId]) ? $listingId : null;
    }

    /**
     * @return array<int, string>
     */
    private function campaignContactIds(EmailCampaign $campaign): array
    {
        return $this->contacts->tenantContactIds(
            $campaign->tenant_id,
            $this->stringList($campaign->contact_ids)
        );
    }

    /**
     * @return array<int, string>
     */
    private function stringList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return collect($value)
            ->filter(fn (mixed $item): bool => is_string($item))
            ->unique()
            ->values()
            ->all();
    }
}
