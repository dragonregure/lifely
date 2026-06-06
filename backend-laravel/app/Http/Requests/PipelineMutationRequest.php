<?php

namespace App\Http\Requests;

use App\Contracts\PipelineRepositoryInterface;
use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Models\Pipeline;
use App\Models\User;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

abstract class PipelineMutationRequest extends FormRequest
{
    use ResolvesTenantForValidation;

    private const ASSIGNEE_FIELDS = ['stage', 'is_active', 'next_task'];
    private const MANUAL_SOURCE_FIELDS = ['contact_id', 'listing_id'];

    private ?Pipeline $pipelineDeal = null;

    protected function prepareForValidation(): void
    {
        if ($this->has('stage')) {
            $stage = Pipeline::stageFromInput($this->input('stage'));

            if ($stage !== null) {
                $this->merge(['stage' => $stage]);
            }
        }

        if (! $this->has('source') || $this->input('source') === null) {
            return;
        }

        $source = Pipeline::sourceFromInput($this->input('source'));

        if ($source !== null) {
            $this->merge(['source' => $source]);
        }
    }

    protected function pipelineDeal(): Pipeline
    {
        if ($this->pipelineDeal instanceof Pipeline) {
            return $this->pipelineDeal;
        }

        $routePipeline = $this->route('pipeline');
        $pipelineId = $routePipeline instanceof Pipeline ? $routePipeline->id : $routePipeline;

        if (! is_string($pipelineId)) {
            throw new NotFoundHttpException('Pipeline deal not found.');
        }

        $pipeline = app(PipelineRepositoryInterface::class)->find($this->tenantIdForAuthorization(), $pipelineId);

        if (! $pipeline) {
            throw new NotFoundHttpException('Pipeline deal not found.');
        }

        return $this->pipelineDeal = $pipeline;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function authorizePipelineUpdate(array $data): void
    {
        $user = $this->user();

        if (! $user instanceof User) {
            throw new HttpException(Response::HTTP_FORBIDDEN);
        }

        if ($user->can(Permissions::SYSTEM_BYPASS)) {
            return;
        }

        $pipeline = $this->pipelineDeal();

        if ($this->hasAnyField($data, self::ASSIGNEE_FIELDS)) {
            $this->denyUnless(
                $user->can(Permissions::PIPELINE_UPDATE) && (string) $pipeline->user_id === (string) $user->id,
                'Only the assigned user can update pipeline progress fields.'
            );
        }

        if ($this->hasAnyField($data, self::MANUAL_SOURCE_FIELDS)) {
            $this->denyUnless(
                $user->can(Permissions::PIPELINE_UPDATE) && (int) $pipeline->source === Pipeline::SOURCE_MANUAL_ENTRY,
                'Contact and listing can only be changed for manual-entry pipeline deals.'
            );
        }

        if (! array_key_exists('user_id', $data) || (string) $data['user_id'] === (string) $pipeline->user_id) {
            return;
        }

        $isAssigningToSelf = (string) $data['user_id'] === (string) $user->id;

        $this->denyUnless(
            $user->can(Permissions::PIPELINE_CHANGE_ASSIGNEE)
                || ($isAssigningToSelf && $user->can(Permissions::PIPELINE_ASSIGN_TO_SELF)),
            'You do not have permission to change this pipeline assignee.'
        );
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function authorizePipelineCreate(array $data): void
    {
        $user = $this->user();

        if (! $user instanceof User) {
            throw new HttpException(Response::HTTP_FORBIDDEN);
        }

        if ($user->can(Permissions::SYSTEM_BYPASS)) {
            return;
        }

        if (! array_key_exists('user_id', $data)) {
            return;
        }

        $isAssigningToSelf = (string) $data['user_id'] === (string) $user->id;

        $this->denyUnless(
            $user->can(Permissions::PIPELINE_CHANGE_ASSIGNEE)
                || ($isAssigningToSelf && $user->can(Permissions::PIPELINE_ASSIGN_TO_SELF)),
            'You do not have permission to set this pipeline assignee.'
        );
    }

    private function tenantIdForAuthorization(): string
    {
        $tenantId = $this->tenantIdForValidation();

        if (! $tenantId) {
            throw ValidationException::withMessages([
                'tenant_id' => ['Provide tenant context using the X-Tenant-Id header or tenant_id parameter.'],
            ]);
        }

        if ($this->user() && $this->user()->tenant_id !== $tenantId) {
            throw new HttpException(403, 'Tenant context does not match the authenticated user.');
        }

        return $tenantId;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, string>  $fields
     */
    private function hasAnyField(array $data, array $fields): bool
    {
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                return true;
            }
        }

        return false;
    }

    private function denyUnless(bool $condition, string $message): void
    {
        if (! $condition) {
            throw new HttpException(Response::HTTP_FORBIDDEN, $message);
        }
    }
}
