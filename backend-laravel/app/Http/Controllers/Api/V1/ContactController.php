<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\ContactRepositoryInterface;
use App\Http\Requests\StoreContactRequest;
use App\Http\Requests\UpdateContactRequest;
use App\Http\Resources\ContactResource;
use App\Support\Rbac\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ContactController extends BaseApiController
{
    public function __construct(private readonly ContactRepositoryInterface $contacts)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize(Permissions::CONTACTS_VIEW);

        return ContactResource::collection($this->contacts->all($this->tenantId($request), [
            'status' => $request->query('status'),
        ]));
    }

    public function store(StoreContactRequest $request): JsonResponse
    {
        $this->authorize(Permissions::CONTACTS_CREATE);

        return (new ContactResource($this->contacts->create($this->tenantId($request), $request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, string $contact): ContactResource
    {
        $this->authorize(Permissions::CONTACTS_VIEW);

        $model = $this->contacts->find($this->tenantId($request), $contact);

        if (! $model) {
            throw new NotFoundHttpException('Contact not found.');
        }

        return new ContactResource($model);
    }

    public function update(UpdateContactRequest $request, string $contact): ContactResource
    {
        $this->authorize(Permissions::CONTACTS_UPDATE);

        $model = $this->contacts->update($this->tenantId($request), $contact, $request->validated());

        if (! $model) {
            throw new NotFoundHttpException('Contact not found.');
        }

        return new ContactResource($model);
    }
}
