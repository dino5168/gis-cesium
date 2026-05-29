from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class ToolEntry:
    schema: dict
    fn: Callable[..., str]


_REGISTRY: dict[str, ToolEntry] = {}


def register(schema: dict) -> Callable:
    """Decorator that registers a function as a callable tool.

    Args:
        schema: OpenAI-compatible function schema dict.

    Returns:
        The original function unchanged.
    """
    def decorator(fn: Callable) -> Callable:
        name: str = schema["function"]["name"]
        _REGISTRY[name] = ToolEntry(schema=schema, fn=fn)
        return fn
    return decorator


def get_all_names() -> list[str]:
    """Return names of all registered tools."""
    return list(_REGISTRY.keys())


def get_all_info() -> list[dict]:
    """Return lightweight info (name + description) for all tools."""
    return [
        {
            "name": name,
            "description": entry.schema["function"].get("description", ""),
        }
        for name, entry in _REGISTRY.items()
    ]


def get_schemas(names: list[str]) -> list[dict]:
    """Return full schemas for the requested tool names.

    Args:
        names: Subset of registered tool names; unknown names are skipped.

    Returns:
        List of schema dicts in registration order.
    """
    return [_REGISTRY[n].schema for n in names if n in _REGISTRY]


def execute(name: str, arguments: dict[str, Any]) -> str:
    """Execute a registered tool and return its string result.

    Args:
        name: Tool name as registered.
        arguments: Keyword arguments parsed from the model's tool call.

    Returns:
        String result, or an error message prefixed with ``[Error]``.
    """
    entry = _REGISTRY.get(name)
    if not entry:
        return f"[Error] Unknown tool: {name}"
    try:
        return entry.fn(**arguments)
    except Exception as exc:  # noqa: BLE001
        return f"[Error] {exc}"
