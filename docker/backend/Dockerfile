FROM php:8.4-fpm

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        default-mysql-client \
        git \
        nginx \
        supervisor \
        libicu-dev \
        libzip-dev \
        unzip \
        zip \
    && docker-php-ext-install pdo_mysql pcntl zip intl \
    && pecl install redis xdebug \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY backend-laravel/composer.json backend-laravel/composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-scripts

COPY backend-laravel ./
COPY docker/backend/entrypoint.sh /usr/local/bin/lifely-backend-entrypoint
COPY docker/backend/nginx.conf /etc/nginx/sites-available/default
COPY docker/backend/supervisord.conf /etc/supervisor/conf.d/lifely.conf

RUN chmod +x /usr/local/bin/lifely-backend-entrypoint \
    && mkdir -p storage bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && composer dump-autoload --optimize

EXPOSE 8000

ENTRYPOINT ["lifely-backend-entrypoint"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/lifely.conf"]
