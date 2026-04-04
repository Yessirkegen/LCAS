# Деплой: K3s на VPS

## Серверы (Hetzner)

| Нода | Тариф | CPU | RAM | Диск | Роль | €/мес |
|---|---|---|---|---|---|---|
| node-1 | CPX51 | 16 vCPU | 32 GB | 360 GB NVMe | master + stateful (DB, Kafka, Redis) | €29 |
| node-2 | CPX41 | 8 vCPU | 16 GB | 240 GB NVMe | worker — app services | €14 |
| node-3 | CPX41 | 8 vCPU | 16 GB | 240 GB NVMe | worker — app services | €14 |
| **Итого** | | **32 vCPU** | **64 GB** | **840 GB** | | **€57/мес** |

## Установка K3s

### Шаг 1: Master (node-1)

```bash
# SSH на node-1
curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --tls-san=<NODE1_PUBLIC_IP> \
  --disable=servicelb \
  --write-kubeconfig-mode=644

# Получить токен для worker-нод
cat /var/lib/rancher/k3s/server/node-token

# Скопировать kubeconfig для локального доступа
cat /etc/rancher/k3s/k3s.yaml
```

### Шаг 2: Workers (node-2, node-3)

```bash
# SSH на node-2 и node-3
curl -sfL https://get.k3s.io | \
  K3S_URL=https://<NODE1_IP>:6443 \
  K3S_TOKEN=<TOKEN> \
  sh -s - agent
```

### Шаг 3: Проверка

```bash
kubectl get nodes
# NAME     STATUS   ROLES                       AGE   VERSION
# node-1   Ready    control-plane,etcd,master   1m    v1.29.x+k3s1
# node-2   Ready    <none>                      30s   v1.29.x+k3s1
# node-3   Ready    <none>                      30s   v1.29.x+k3s1
```

## Установка операторов

### Strimzi (Kafka)

```bash
kubectl create namespace infra

# Установка оператора
kubectl create -f 'https://strimzi.io/install/latest?namespace=infra' -n infra

# Ждём готовности
kubectl wait --for=condition=Ready pod -l name=strimzi-cluster-operator -n infra --timeout=300s

# Применяем кластер Kafka
kubectl apply -f k8s/infra/kafka-cluster.yaml
kubectl apply -f k8s/infra/kafka-topics.yaml
```

### CloudNativePG (PostgreSQL)

```bash
# Установка оператора
kubectl apply --server-side -f \
  https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.23/releases/cnpg-1.23.0.yaml

# Ждём готовности
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=cloudnative-pg -n cnpg-system --timeout=300s

# Применяем кластер PostgreSQL
kubectl apply -f k8s/infra/postgres-cluster.yaml
```

### cert-manager (TLS)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# ClusterIssuer для Let's Encrypt
kubectl apply -f k8s/ingress/cluster-issuer.yaml
```

### Monitoring

```bash
kubectl create namespace monitoring

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set grafana.adminPassword=<GRAFANA_PASSWORD> \
  --set prometheus.prometheusSpec.retention=7d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

## Деплой приложения

### Namespaces и конфигурация

```bash
kubectl apply -f k8s/namespaces.yaml
kubectl apply -f k8s/config/configmap.yaml
kubectl apply -f k8s/config/secrets.yaml
```

### Сервисы

```bash
kubectl apply -f k8s/app/ingestion.yaml
kubectl apply -f k8s/app/processor.yaml
kubectl apply -f k8s/app/ws-hub.yaml
kubectl apply -f k8s/app/rest-api.yaml
kubectl apply -f k8s/app/frontend.yaml
```

### Ingress

```bash
kubectl apply -f k8s/ingress/ingress.yaml
```

### Одной командой (Makefile)

```bash
make deploy
```

```makefile
# Makefile
.PHONY: deploy infra app monitoring

deploy: infra app monitoring
	@echo "Deployment complete"

infra:
	kubectl apply -f k8s/namespaces.yaml
	kubectl apply -f k8s/config/
	kubectl apply -f k8s/infra/

app:
	kubectl apply -f k8s/app/

monitoring:
	helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
		--namespace monitoring --create-namespace \
		-f k8s/monitoring/prometheus-values.yaml

clean:
	kubectl delete -f k8s/app/
	kubectl delete -f k8s/infra/
```

## HPA (авто-скейлинг)

Каждый stateless-сервис имеет HPA:

| Сервис | min pods | max pods | CPU target | Scale-up window | Scale-down window |
|---|---|---|---|---|---|
| ingestion | 2 | 10 | 70% | 30 сек | 120 сек |
| processor | 2 | 10 | 70% | 30 сек | 120 сек |
| ws-hub | 2 | 8 | 60% | 30 сек | 120 сек |
| rest-api | 2 | 6 | 70% | 60 сек | 120 сек |
| frontend | 2 | 2 | — | — | — |

Проверка:
```bash
kubectl get hpa -n locomotive
# NAME             REFERENCE           TARGETS   MINPODS   MAXPODS   REPLICAS
# ingestion-hpa    Deployment/ingest   42%/70%   2         10        2
# processor-hpa    Deployment/proc     55%/70%   2         10        2
# ws-hub-hpa       Deployment/ws-hub   28%/60%   2         8         2
# rest-api-hpa     Deployment/api      15%/70%   2         6         2
```

## Добавление ноды

```bash
# На новом сервере:
curl -sfL https://get.k3s.io | \
  K3S_URL=https://<NODE1_IP>:6443 \
  K3S_TOKEN=<TOKEN> \
  sh -s - agent

# Проверка:
kubectl get nodes
```

K8s scheduler автоматически начнёт размещать новые поды на добавленной ноде.

## Docker Registry

Для приватных образов — GitHub Container Registry (ghcr.io):

```bash
# Создать secret для pull
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<GITHUB_USER> \
  --docker-password=<GITHUB_TOKEN> \
  -n locomotive

# В Deployment:
# spec.template.spec.imagePullSecrets:
#   - name: ghcr-secret
```

CI/CD: GitHub Actions → build → push to ghcr.io → kubectl apply.

## Портируемость

Всё в проекте — open-source, без vendor lock-in:

| Компонент | Технология | Лицензия |
|---|---|---|
| Оркестрация | K3s (Kubernetes) | Apache 2.0 |
| Kafka | Apache Kafka (Strimzi) | Apache 2.0 |
| PostgreSQL | PostgreSQL + TimescaleDB | PostgreSQL + Apache 2.0 |
| Redis | Redis | BSD |
| Ingress | Traefik | MIT |
| TLS | cert-manager + Let's Encrypt | Apache 2.0 |
| Monitoring | Prometheus + Grafana | Apache 2.0 |

Миграция на серверы заказчика:
1. Установить K3s (3 команды)
2. `git clone` + `make deploy`
3. Обновить DNS
4. Готово

## Структура файлов k8s/

```
k8s/
├── namespaces.yaml
├── config/
│   ├── configmap.yaml
│   └── secrets.yaml
├── infra/
│   ├── kafka-cluster.yaml
│   ├── kafka-topics.yaml
│   ├── postgres-cluster.yaml
│   └── redis.yaml
├── app/
│   ├── ingestion.yaml        # Deployment + Service + HPA
│   ├── processor.yaml
│   ├── ws-hub.yaml
│   ├── rest-api.yaml
│   ├── frontend.yaml
│   └── simulator.yaml
├── ingress/
│   ├── ingress.yaml
│   └── cluster-issuer.yaml
├── monitoring/
│   └── prometheus-values.yaml
└── Makefile
```
