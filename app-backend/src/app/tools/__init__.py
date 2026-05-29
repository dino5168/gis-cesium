from app.tools import registry
from app.tools import builtins as _builtins  # noqa: F401 — triggers @register side effects

__all__ = ["registry"]
