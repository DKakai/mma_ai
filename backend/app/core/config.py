from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Combat AI"
    cors_allow_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_prefix = "COMBAT_AI_"


settings = Settings()
