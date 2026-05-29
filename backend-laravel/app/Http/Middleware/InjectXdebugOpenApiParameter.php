<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Yaml\Yaml;

class InjectXdebugOpenApiParameter
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (app()->environment('production') || $response->getStatusCode() !== Response::HTTP_OK) {
            return $response;
        }

        $document = Yaml::parse($response->getContent() ?: '');

        if (! is_array($document)) {
            return $response;
        }

        $document['paths'] = $this->withXdebugParameter($document['paths'] ?? []);
        $response->setContent(Yaml::dump($document, 20, 2, Yaml::DUMP_OBJECT_AS_MAP));

        return $response;
    }

    private function withXdebugParameter(mixed $paths): mixed
    {
        if (! is_array($paths)) {
            return $paths;
        }

        foreach ($paths as $path => $operations) {
            if (! is_array($operations)) {
                continue;
            }

            foreach ($operations as $method => $operation) {
                if (! $this->isHttpOperation($method) || ! is_array($operation)) {
                    continue;
                }

                $operations[$method] = $this->operationWithXdebugParameter($operation);
            }

            $paths[$path] = $operations;
        }

        return $paths;
    }

    /**
     * @param  array<string, mixed>  $operation
     * @return array<string, mixed>
     */
    private function operationWithXdebugParameter(array $operation): array
    {
        $parameters = $operation['parameters'] ?? [];

        if (! is_array($parameters)) {
            $parameters = [];
        }

        foreach ($parameters as $parameter) {
            if (is_array($parameter) && ($parameter['name'] ?? null) === 'XDEBUG_SESSION_START') {
                return $operation;
            }
        }

        $operation['parameters'] = array_merge([
            [
                'in' => 'query',
                'name' => 'XDEBUG_SESSION_START',
                'required' => false,
                'schema' => [
                    'type' => 'string',
                    'default' => '1',
                ],
                'description' => 'Starts an Xdebug debug session for local and non-production environments.',
            ],
        ], $parameters);

        return $operation;
    }

    private function isHttpOperation(string|int $method): bool
    {
        return in_array(strtolower((string) $method), [
            'get',
            'post',
            'put',
            'patch',
            'delete',
            'options',
            'head',
            'trace',
        ], true);
    }
}
