import ollama as ol
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings
from app.services import ollama as ollama_svc
from app.tools import registry

router = APIRouter(prefix="/tools", tags=["tools"])

MAX_ITERATIONS = 10  # prevent runaway tool-call loops


# ── Models ─────────────────────────────────────────────

class MessageIn(BaseModel):
    role: str
    content: str


class ToolInfo(BaseModel):
    name: str
    description: str


class ToolCallRecord(BaseModel):
    name: str
    arguments: dict
    result: str


class ToolChatRequest(BaseModel):
    messages: list[MessageIn]
    tools: list[str] = []  # empty → use all registered tools
    model: str = settings.default_model


class ToolChatResponse(BaseModel):
    content: str
    tool_calls: list[ToolCallRecord]


# ── Routes ─────────────────────────────────────────────

@router.get("", response_model=list[ToolInfo])
async def list_tools() -> list[ToolInfo]:
    """Return metadata for all registered tools.

    Returns:
        List of ToolInfo with name and description.
    """
    return [ToolInfo(**t) for t in registry.get_all_info()]


@router.post("/chat", response_model=ToolChatResponse)
async def tool_chat(body: ToolChatRequest) -> ToolChatResponse:
    """Multi-turn chat with server-side tool execution loop.

    The backend resolves all tool calls internally and returns only the
    final model response along with a log of every tool invocation.

    Args:
        body: Request containing messages, optional tool filter, and model.

    Returns:
        ToolChatResponse with final content and ordered tool call log.
    """
    tool_names = body.tools or registry.get_all_names()
    schemas = registry.get_schemas(tool_names)

    messages: list[ol.Message] = [
        {"role": m.role, "content": m.content} for m in body.messages
    ]
    call_log: list[ToolCallRecord] = []

    for _ in range(MAX_ITERATIONS):
        response = await ollama_svc.chat_with_tools(messages, schemas, body.model)

        if not response.message.tool_calls:
            return ToolChatResponse(
                content=response.message.content or "",
                tool_calls=call_log,
            )

        # Append the assistant's tool-call message to history
        messages.append(response.message)

        # Execute every requested tool and feed results back
        for call in response.message.tool_calls:
            result = registry.execute(
                call.function.name,
                dict(call.function.arguments),
            )
            call_log.append(ToolCallRecord(
                name=call.function.name,
                arguments=dict(call.function.arguments),
                result=result,
            ))
            messages.append({"role": "tool", "content": result})

    return ToolChatResponse(
        content="（已達工具呼叫上限，部分結果可能不完整）",
        tool_calls=call_log,
    )
