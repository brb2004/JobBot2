# server/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    secret_key: str = "default_secret"
    anthropic_api_key: str
    pdf_storage_path: str = "./data/pdfs"
    environment: str = "development"

    model_config = {"env_file": ".env"}


settings = Settings()
