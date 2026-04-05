from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    postgres_user: str = "locomotive"
    postgres_password: str = "locomotive_dev_2025"
    postgres_db: str = "locomotive_telemetry"
    postgres_host: str = "postgres"
    postgres_port: int = 5432

    redis_url: str = "redis://redis:6379"

    kafka_bootstrap_servers: str = "kafka:9092"

    jwt_secret: str = "dev-secret-change-in-production-42"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    class Config:
        env_file = ".env.local"


settings = Settings()
