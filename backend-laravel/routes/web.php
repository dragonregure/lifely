<?php

use Illuminate\Support\Facades\Route;

Route::redirect('/', '/docs/index.html');
Route::redirect('/api/documentation', '/docs/index.html');
