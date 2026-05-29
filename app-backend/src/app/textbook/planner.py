import json
import re
import time

from app.config import settings
from app.services import ollama as ollama_svc
from app.textbook.schemas import ChapterMeta, ChaptersJson, PlanRequest

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
_JSON_BLOCK_RE = re.compile(r"```json\s*([\s\S]*?)\s*```", re.IGNORECASE)
_JSON_OBJ_RE = re.compile(r"\{[\s\S]*\}")


class TextbookPlanError(Exception):
    pass


def _extract_json(text: str) -> dict:
    """Extract first parseable JSON object from AI response text.

    Args:
        text: Raw AI response string.

    Returns:
        Parsed dict.

    Raises:
        ValueError: If no valid JSON found.
    """
    # Direct parse
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # ```json ... ``` block
    m = _JSON_BLOCK_RE.search(text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass

    # Bare { ... } object
    m = _JSON_OBJ_RE.search(text)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON found in: {text[:300]}")


def _safe_slug(raw: str) -> str:
    """Return raw slug if valid, otherwise a timestamp fallback.

    Args:
        raw: Candidate slug string from AI.

    Returns:
        Valid kebab-case slug.
    """
    if _SLUG_RE.match(raw or ""):
        return raw
    return f"textbook-{int(time.time())}"


_SYSTEM = (
    "你是教材設計 API。請嚴格以純 JSON 格式回答，"
    "不得包含任何說明文字、markdown 符號或 code fence。"
)


def _build_prompt(req: PlanRequest) -> str:
    return (
        f"請為教材主題「{req.topic}」設計章節架構。\n\n"
        f"條件：\n"
        f"- 適用年級：{req.grade}\n"
        f"- 內容語言：{req.language}\n"
        f"- 章節數量：{req.num_chapters}\n\n"
        "請回傳以下 JSON（不含任何其他文字）：\n"
        "{\n"
        '  "book_slug": "kebab-case-english-name",\n'
        '  "chapters": [\n'
        "    {\n"
        '      "id": 1,\n'
        f'      "title": "章節標題（{req.language}）",\n'
        '      "slug": "english-chapter-slug",\n'
        f'      "description": "本章說明（{req.language}，50字以內）"\n'
        "    }\n"
        "  ]\n"
        "}"
    )


async def generate_plan(req: PlanRequest) -> tuple[str, ChaptersJson]:
    """Call AI to produce a chapter plan for the given topic.

    Args:
        req: Plan parameters including topic, grade, language, num_chapters.

    Returns:
        Tuple of (book_slug, ChaptersJson).

    Raises:
        TextbookPlanError: If AI fails to return valid JSON after 3 attempts.
    """
    messages: list[dict] = [
        {"role": "system", "content": _SYSTEM},
        {"role": "user", "content": _build_prompt(req)},
    ]

    last_error: Exception = RuntimeError("no attempts made")
    last_text = ""

    for attempt in range(3):
        try:
            response = await ollama_svc.chat(messages, settings.default_model)
            last_text = response.message.content or ""
            data = _extract_json(last_text)
            book_slug = _safe_slug(data.get("book_slug", ""))
            chapters = [ChapterMeta(**ch) for ch in data["chapters"]]
            return book_slug, ChaptersJson(chapters=chapters)
        except Exception as exc:
            last_error = exc
            if attempt < 2:
                messages += [
                    {"role": "assistant", "content": last_text},
                    {
                        "role": "user",
                        "content": "格式錯誤。請只回傳純 JSON，不要任何說明或 markdown 符號。",
                    },
                ]

    raise TextbookPlanError(f"Plan generation failed after 3 attempts: {last_error}")
