"""Built-in tools registered at import time via @register decorators."""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.tools.registry import register

_DOCS_DIR = (Path(__file__).parent.parent.parent.parent / "docs").resolve()


# ── Tool 1: get_current_datetime ───────────────────────

@register({
    "type": "function",
    "function": {
        "name": "get_current_datetime",
        "description": "取得目前的日期與時間（台灣時區 UTC+8）",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
})
def get_current_datetime() -> str:
    tz = timezone(timedelta(hours=8))
    return datetime.now(tz).strftime("%Y年%m月%d日 %H:%M:%S (UTC+8)")


# ── Tool 2: calculate_distance ─────────────────────────

@register({
    "type": "function",
    "function": {
        "name": "calculate_distance",
        "description": "使用 Haversine 公式計算地球上兩個 WGS84 坐標點之間的直線距離",
        "parameters": {
            "type": "object",
            "properties": {
                "lat1": {"type": "number", "description": "起點緯度（十進位度）"},
                "lon1": {"type": "number", "description": "起點經度（十進位度）"},
                "lat2": {"type": "number", "description": "終點緯度（十進位度）"},
                "lon2": {"type": "number", "description": "終點經度（十進位度）"},
            },
            "required": ["lat1", "lon1", "lat2", "lon2"],
        },
    },
})
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
    R = 6_371_000  # Earth radius in metres
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)
    a = math.sin(Δφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ / 2) ** 2
    d = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    if d >= 1_000:
        return f"{d / 1_000:.2f} 公里"
    return f"{d:.0f} 公尺"


# ── Tool 3: list_doc_books ─────────────────────────────

@register({
    "type": "function",
    "function": {
        "name": "list_doc_books",
        "description": "列出系統中可用的文件書籍名稱與所有章節標題",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
})
def list_doc_books() -> str:
    results: list[str] = []
    for book_dir in sorted(_DOCS_DIR.iterdir()):
        if not book_dir.is_dir():
            continue
        chapters_file = book_dir / "chapters.json"
        if not chapters_file.is_file():
            continue
        data = json.loads(chapters_file.read_text(encoding="utf-8"))
        lines = [f"📚 {book_dir.name}"]
        for ch in data.get("chapters", []):
            lines.append(f"  Ch{ch['id']}: {ch['title']}")
        results.append("\n".join(lines))
    return "\n\n".join(results) if results else "目前無可用文件"


# ── Tool 4: search_docs ────────────────────────────────

@register({
    "type": "function",
    "function": {
        "name": "search_docs",
        "description": "在文件庫中搜尋包含指定關鍵字的段落，回傳最相關的文件摘錄",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜尋關鍵字（支援中英文）"},
                "top_k": {
                    "type": "integer",
                    "description": "最多回傳幾筆結果（預設 3，最大 5）",
                    "default": 3,
                },
            },
            "required": ["query"],
        },
    },
})
def search_docs(query: str, top_k: int = 3) -> str:
    top_k = min(top_k, 5)
    hits: list[str] = []

    for md_file in sorted(_DOCS_DIR.rglob("*.md")):
        lines = md_file.read_text(encoding="utf-8", errors="ignore").splitlines()
        for i, line in enumerate(lines):
            if query.lower() in line.lower():
                start = max(0, i - 1)
                end = min(len(lines), i + 4)
                excerpt = "\n".join(lines[start:end])
                rel = md_file.relative_to(_DOCS_DIR)
                hits.append(f"📄 {rel}\n{excerpt}")
                break  # one hit per file

    if not hits:
        return f"找不到包含「{query}」的文件片段"
    return "\n\n---\n\n".join(hits[:top_k])
