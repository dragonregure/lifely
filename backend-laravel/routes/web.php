<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Session\Middleware\StartSession;

Route::redirect('/', '/docs/index.html')->withoutMiddleware([StartSession::class]);
