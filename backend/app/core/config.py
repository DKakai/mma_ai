from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Combat AI"
    cors_allow_origins_csv: str = Field(
        default="http://localhost:5173",
        validation_alias="COMBAT_AI_CORS_ALLOW_ORIGINS",
    )
    anthropic_api_key: str | None = Field(
        default=None, validation_alias="ANTHROPIC_API_KEY"
    )

    @property
    def cors_allow_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins_csv.split(",") if o.strip()]


settings = Settings()
