<?php

namespace Tests\Feature;

use Tests\TestCase;

class DocumentationRedirectTest extends TestCase
{
    public function test_root_redirects_to_api_documentation_without_session(): void
    {
        $this->get('/')
            ->assertRedirect('/api/documentation');
    }

    public function test_l5_swagger_documentation_is_available(): void
    {
        $this->get('/api/documentation')
            ->assertOk()
            ->assertSee('Lifely API');
    }

    public function test_openapi_yaml_is_available_to_l5_swagger(): void
    {
        $this->get('/api/docs')
            ->assertOk()
            ->assertSee('openapi: 3.0.3');
    }

    public function test_openapi_yaml_includes_xdebug_query_parameter_outside_production(): void
    {
        $this->get('/api/docs')
            ->assertOk()
            ->assertSee('XDEBUG_SESSION_START');
    }

    public function test_openapi_yaml_omits_xdebug_query_parameter_in_production(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');

        $this->get('/api/docs')
            ->assertOk()
            ->assertDontSee('XDEBUG_SESSION_START');
    }
}
