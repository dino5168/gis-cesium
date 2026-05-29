from collections.abc import AsyncIterator

import ollama

from app.config import settings


def _client() -> ollama.AsyncClient:
    return ollama.AsyncClient(host=settings.ollama_host)


async def chat(
    messages: list[ollama.Message],
    model: str,
) -> ollama.ChatResponse:
    """Send a non-streaming chat request to Ollama.

    Args:
        messages: Conversation history in Ollama message format.
        model: Model name, e.g. "gemma4:e4b".

    Returns:
        Full ChatResponse from Ollama.

    Raises:
        ollama.ResponseError: On Ollama API errors.
    """
    return await _client().chat(model=model, messages=messages)


async def chat_stream(
    messages: list[ollama.Message],
    model: str,
) -> AsyncIterator[ollama.ChatResponse]:
    """Yield partial ChatResponse chunks for streaming.

    Args:
        messages: Conversation history in Ollama message format.
        model: Model name, e.g. "gemma4:e4b".

    Yields:
        Partial ChatResponse chunks until done=True.

    Raises:
        ollama.ResponseError: On Ollama API errors.
    """
    async for chunk in await _client().chat(model=model, messages=messages, stream=True):
        yield chunk


async def chat_with_tools(
    messages: list[ollama.Message],
    tools: list[dict],
    model: str,
) -> ollama.ChatResponse:
    """Send a chat request with tool definitions; does NOT stream.

    Args:
        messages: Conversation history including any prior tool results.
        tools: List of OpenAI-compatible tool schema dicts.
        model: Model name.

    Returns:
        ChatResponse — may contain ``message.tool_calls`` if the model
        wants to invoke a tool.

    Raises:
        ollama.ResponseError: On Ollama API errors.
    """
    return await _client().chat(model=model, messages=messages, tools=tools)


async def list_models() -> list[ollama.ListResponse.Model]:
    """Return all models available on the local Ollama instance.

    Returns:
        List of model metadata objects.
    """
    response = await _client().list()
    return response.models
