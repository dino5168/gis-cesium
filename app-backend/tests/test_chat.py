from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _mock_chat_response(content: str = "Hello there!") -> MagicMock:
    resp = MagicMock()
    resp.message.role = "assistant"
    resp.message.content = content
    resp.model = "gemma4:e4b"
    resp.done = True
    return resp


@pytest.mark.asyncio
async def test_health_ok() -> None:
    model = MagicMock()
    model.model = "gemma4:e4b"
    with patch("app.main.ollama_svc.list_models", new=AsyncMock(return_value=[model])):
        resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "gemma4:e4b" in data["models"]


@pytest.mark.asyncio
async def test_chat_returns_assistant_message() -> None:
    mock_resp = _mock_chat_response("Hi!")
    with patch("app.routers.chat.ollama_svc.chat", new=AsyncMock(return_value=mock_resp)):
        resp = client.post(
            "/chat",
            json={"messages": [{"role": "user", "content": "Hello"}]},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"]["role"] == "assistant"
    assert data["message"]["content"] == "Hi!"
    assert data["done"] is True


@pytest.mark.asyncio
async def test_chat_stream_returns_sse() -> None:
    async def mock_stream(*_args, **_kwargs):
        chunk = _mock_chat_response("chunk1")
        chunk.done = False
        yield chunk
        final = _mock_chat_response("chunk2")
        final.done = True
        yield final

    with patch("app.routers.chat.ollama_svc.chat_stream", new=mock_stream):
        resp = client.post(
            "/chat/stream",
            json={"messages": [{"role": "user", "content": "Hello"}]},
        )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    lines = [ln for ln in resp.text.splitlines() if ln.startswith("data:")]
    assert len(lines) == 2
