FROM php:8.3-cli

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        default-mysql-client \
        git \
        libzip-dev \
        unzip \
        zip \
    && docker-php-ext-install pdo_mysql pcntl zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY backend-laravel/composer.json backend-laravel/composer.lock ./
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

COPY backend-laravel ./
COPY docker/backend/entrypoint.sh /usr/local/bin/lifely-backend-entrypoint

RUN chmod +x /usr/local/bin/lifely-backend-entrypoint \
    && mkdir -p storage bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8000

ENTRYPOINT ["lifely-backend-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
