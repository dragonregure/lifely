.PHONY: artisan composer npm

artisan:
	docker compose exec backend php artisan $(filter-out $@,$(MAKECMDGOALS))

composer:
	docker compose exec backend composer $(filter-out $@,$(MAKECMDGOALS))

npm:
	docker compose exec frontend npm $(filter-out $@,$(MAKECMDGOALS))

%:
	@: