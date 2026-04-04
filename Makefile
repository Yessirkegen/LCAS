.PHONY: dev down build logs ps

dev:
	docker compose --env-file .env.local up --build -d

down:
	docker compose down

build:
	docker compose --env-file .env.local build

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

ps:
	docker compose ps

restart-backend:
	docker compose restart backend

restart-frontend:
	docker compose restart frontend

clean:
	docker compose down -v --remove-orphans
