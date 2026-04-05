.PHONY: dev down build logs ps clean

dev:
	docker compose --env-file .env.local up --build -d

down:
	docker compose down

build:
	docker compose --env-file .env.local build

logs:
	docker compose logs -f

logs-ingestion:
	docker compose logs -f svc-ingestion-1 svc-ingestion-2 svc-ingestion-3

logs-processor:
	docker compose logs -f svc-processor-1 svc-processor-2 svc-processor-3 svc-processor-4

logs-api:
	docker compose logs -f svc-api-1 svc-api-2

logs-ws:
	docker compose logs -f svc-ws-gateway-1 svc-ws-gateway-2

logs-simulator:
	docker compose logs -f svc-simulator

logs-frontend:
	docker compose logs -f frontend

logs-nginx:
	docker compose logs -f nginx

ps:
	docker compose ps

restart-ingestion:
	docker compose restart svc-ingestion-1 svc-ingestion-2 svc-ingestion-3

restart-processor:
	docker compose restart svc-processor-1 svc-processor-2 svc-processor-3 svc-processor-4

restart-api:
	docker compose restart svc-api-1 svc-api-2

restart-ws:
	docker compose restart svc-ws-gateway-1 svc-ws-gateway-2

restart-simulator:
	docker compose restart svc-simulator

restart-frontend:
	docker compose restart frontend

clean:
	docker compose down -v --remove-orphans
