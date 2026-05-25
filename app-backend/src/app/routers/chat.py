import json

import ollama
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.services import ollama as ollama_svc

router = APIRouter(prefix="/chat", tags=["chat"])


class MessageIn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[MessageIn]
    model: str = settings.default_model


class MessageOut(BaseModel):
    role: str
    content: str


class ChatResponse(BaseModel):
    message: MessageOut
    model: str
    done: bool


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    """Single-turn chat completion (non-streaming).

    Args:
        body: Chat request with messages and optional model override.

    Returns:
        Assistant message with model and completion status.
    """
    messages: list[ollama.Message] = [
        {"role": m.role, "content": m.content} for m in body.messages
    ]
    resp = await ollama_svc.chat(messages, body.model)
    return ChatResponse(
        message=MessageOut(role=resp.message.role, content=resp.message.content),
        model=resp.model,
        done=resp.done,
    )


@router.post("/stream")
async def chat_stream(body: ChatRequest) -> StreamingResponse:
    """Streaming chat completion via Server-Sent Events.

    Each SSE event contains a JSON-encoded partial ChatResponse.
    The stream ends with an event where ``done`` is ``true``.

    Args:
        body: Chat request with messages and optional model override.

    Returns:
        StreamingResponse with Content-Type text/event-stream.
    """
    messages: list[ollama.Message] = [
        {"role": m.role, "content": m.content} for m in body.messages
    ]

    async def event_generator():
        async for chunk in ollama_svc.chat_stream(messages, body.model):
            payload = {
                "message": {"role": chunk.message.role, "content": chunk.message.content},
                "model": chunk.model,
                "done": chunk.done,
            }
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
