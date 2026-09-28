from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "BoomerBot API"
    SECRET_KEY: str = "super-secret-hackathon-key-for-boomerbot-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # Using strictly VW Cloud LLMaaS

    LLMAAS_IDP_URL: str = ""
    LLMAAS_BASE_URL: str = "https://llmapi.ai.vwgroup.com"
    LLMAAS_CLIENT_ID: str = ""
    LLMAAS_CLIENT_SECRET: str = ""
    LLMAAS_API_KEY: str = ""
    LLMAAS_CHAT_MODEL: str = "gpt-4o"
    LLMAAS_EMBEDDING_MODEL: str = "text-embedding-3-large"

    # LLMAAS is the only provider used

    # Max vector distance treated as a semantic cache hit.
    # Measured for text-embedding-3-large: paraphrases 0.20-0.36, unrelated questions 0.67+.
    SEMANTIC_CACHE_THRESHOLD: float = 0.45

    CLOUDINARY_URL: str = ""
    DATABASE_URL: str = "sqlite:///./boomerbot.db"

    @property
    def chat_model(self) -> str:
        return self.LLMAAS_CHAT_MODEL

    @property
    def semantic_cache_threshold(self) -> float:
        return self.SEMANTIC_CACHE_THRESHOLD

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
