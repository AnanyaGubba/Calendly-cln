from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Calendly Clone API"
    frontend_url: str = "http://localhost:5173"
    default_timezone: str = "Asia/Kolkata"
    database_url: str = "sqlite:///./calendly_clone.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
