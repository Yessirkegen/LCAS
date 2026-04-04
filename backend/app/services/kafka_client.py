from aiokafka import AIOKafkaProducer
from aiokafka.admin import AIOKafkaAdminClient, NewTopic

from app.config import settings

TOPICS = [
    ("raw-telemetry", 12),
    ("processed-telemetry", 12),
    ("alerts", 6),
]

kafka_producer = AIOKafkaProducer(
    bootstrap_servers=settings.kafka_bootstrap_servers,
    value_serializer=lambda v: __import__("json").dumps(v).encode("utf-8"),
    key_serializer=lambda k: k.encode("utf-8") if k else None,
)


async def create_topics():
    admin = AIOKafkaAdminClient(bootstrap_servers=settings.kafka_bootstrap_servers)
    await admin.start()
    try:
        existing = await admin.list_topics()
        new_topics = [
            NewTopic(name=name, num_partitions=partitions, replication_factor=1)
            for name, partitions in TOPICS
            if name not in existing
        ]
        if new_topics:
            await admin.create_topics(new_topics)
    finally:
        await admin.close()
