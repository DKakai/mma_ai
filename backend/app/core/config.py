from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "MMA AI"
    cors_allow_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_prefix = "MMA_AI_"


settings = Settings()
