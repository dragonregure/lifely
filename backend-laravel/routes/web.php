<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use Illuminate\Session\Middleware\StartSession;

Route::redirect('/', '/docs/index.html')->withoutMiddleware([
    StartSession::class,
    ShareErrorsFromSession::class,
    PreventRequestForgery::class,
]);
