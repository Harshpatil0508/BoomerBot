"""VW Cloud LLMaaS access: OAuth token caching and OpenAI-compatible client factories."""
import threading
import time

import httpx
from openai import AsyncOpenAI, OpenAI

from app.core.config import settings

# Tokens live 30 minutes; refresh early so no request is issued with a nearly-dead token.
_REFRESH_MARGIN_SECONDS = 120

_lock = threading.Lock()
_token: str | None = None
_token_expiry: float = 0.0

_sync_client: OpenAI | None = None
_async_client: AsyncOpenAI | None = None
_client_token: str | None = None


def get_token() -> str:
    global _token, _token_expiry

    with _lock:
        if _token and time.time() < _token_expiry:
            return _token

        response = httpx.post(
            settings.LLMAAS_IDP_URL,
            data={
                "client_id": settings.LLMAAS_CLIENT_ID,
                "client_secret": settings.LLMAAS_CLIENT_SECRET,
                "grant_type": "client_credentials",
            },
            timeout=30,
        )
        if response.status_code != 200:
            raise RuntimeError(f"LLMaaS token request failed: {response.status_code}")

        payload = response.json()
        _token = payload["access_token"]
        _token_expiry = time.time() + max(payload.get("expires_in", 1800) - _REFRESH_MARGIN_SECONDS, 60)
        return _token


def _headers() -> dict:
    return {"X-LLM-API-CLIENT-ID": f"Bearer {settings.LLMAAS_API_KEY}"}


def _rebuild_clients(token: str):
    global _sync_client, _async_client, _client_token
    _sync_client = OpenAI(api_key=token, base_url=settings.LLMAAS_BASE_URL, default_headers=_headers())
    _async_client = AsyncOpenAI(api_key=token, base_url=settings.LLMAAS_BASE_URL, default_headers=_headers())
    _client_token = token


def get_sync_client() -> OpenAI | None:
    token = get_token()
    if _sync_client is None or _client_token != token:
        _rebuild_clients(token)
    return _sync_client


def get_async_client() -> AsyncOpenAI | None:
    token = get_token()
    if _async_client is None or _client_token != token:
        _rebuild_clients(token)
    return _async_client


def get_langchain_chat(temperature: float = 0.0, **kwargs):
    """ChatOpenAI bound to LLMaaS."""
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=settings.LLMAAS_CHAT_MODEL,
        temperature=temperature,
        api_key=get_token(),
        base_url=settings.LLMAAS_BASE_URL,
        default_headers=_headers(),
        **kwargs,
    )


def embed_texts(texts: list[str], batch_size: int = 100) -> list[list[float]]:
    client = get_sync_client()
    if client is None:
        raise RuntimeError("LLMaaS is not configured; cannot embed")

    vectors: list[list[float]] = []
    for start in range(0, len(texts), batch_size):
        batch = texts[start:start + batch_size]
        response = client.embeddings.create(
            model=settings.LLMAAS_EMBEDDING_MODEL,
            input=batch,
            encoding_format="float",
        )
        vectors.extend(item.embedding for item in sorted(response.data, key=lambda d: d.index))
    return vectors
