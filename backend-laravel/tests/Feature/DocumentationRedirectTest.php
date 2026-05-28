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
}
