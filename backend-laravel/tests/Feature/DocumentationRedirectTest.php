<?php

namespace Tests\Feature;

use Tests\TestCase;

class DocumentationRedirectTest extends TestCase
{
    public function test_root_redirects_to_api_documentation_without_session(): void
    {
        $this->get('/')
            ->assertRedirect('/docs/index.html');
    }
}
