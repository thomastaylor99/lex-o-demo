"""Runtime settings, read from the environment and the repo's .env."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", REPO_ROOT / "backend" / ".env"), extra="ignore"
    )

    mistral_api_key: str = ""
    stt_model: str = "voxtral-transcribe-realtime-3"
    stt_streaming_delay_ms: int | None = None
    agent_model: str = "mistral-small-latest"
    agent_fallback_model: str = "mistral-medium-latest"
    agent_temperature: float = 0.3
    llm_first_token_timeout_s: float = 2.5
    extractor_model: str = "mistral-small-latest"
    judge_model: str = "mistral-medium-latest"
    tts_model: str = "voxtral-mini-tts-2603"
    tts_first_chunk_timeout_s: float = 5.0  # per attempt
    tts_hedge_after_s: float = 0.9  # race a second request when the first is this slow
    tts_max_attempts: int = 3
    session_ttl_s: int = 1800
    observer_timeout_s: float = 3.0
    catalogue_path: Path = REPO_ROOT / "backend" / "app" / "catalogue" / "data" / "products.json"
    cors_origins: list[str] = ["http://localhost:3000"]
