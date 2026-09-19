.PHONY: artisan composer npm

artisan:
	docker compose exec backend-laravel php artisan $(filter-out $@,$(MAKECMDGOALS))

composer:
	docker compose exec backend-laravel composer $(filter-out $@,$(MAKECMDGOALS))

npm:
	docker compose exec frontend npm $(filter-out $@,$(MAKECMDGOALS))

%:
	@:
