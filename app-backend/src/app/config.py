from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    ollama_host: str = "http://localhost:11434"
    default_model: str = "gemma4:e2b"


settings = Settings()
