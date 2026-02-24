from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    mongo_url: str = "mongodb://mongo:27017"
    mongo_db: str = "japan_itinerary"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_default_region: str = "us-east-1"
    bedrock_model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
