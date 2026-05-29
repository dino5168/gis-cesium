import json
import re

from app.config import settings
from app.services import ollama as ollama_svc
from app.textbook.schemas import ChapterMeta

_JSON_BLOCK_RE = re.compile(r"```json\s*([\s\S]*?)\s*```", re.IGNORECASE)
_JSON_OBJ_RE = re.compile(r"\{[\s\S]*\}")


def _parse_pages(text: str) -> list[dict]:
    """Extract {"pages": [...]} from AI text.

    Args:
        text: Raw AI response.

    Returns:
        List of page dicts with "title" and "slug" keys, or empty list on failure.
    """
    for pattern in (_JSON_BLOCK_RE, _JSON_OBJ_RE):
        m = pattern.search(text)
        if m:
            try:
                data = json.loads(m.group(1) if pattern is _JSON_BLOCK_RE else m.group(0))
                pages = data.get("pages", [])
                if isinstance(pages, list) and pages:
                    return pages
            except (json.JSONDecodeError, AttributeError):
                pass
    return []


def _fallback_pages(n: int) -> list[dict]:
    return [{"title": f"第{i + 1}節", "slug": f"page-{i + 1}"} for i in range(n)]


async def _get_page_list(chapter: ChapterMeta, n: int, language: str) -> list[dict]:
    """Ask AI to generate a sub-page list (title + slug) for one chapter.

    Args:
        chapter: Chapter metadata.
        n: Number of sub-pages.
        language: Content language code.

    Returns:
        List of {"title": str, "slug": str} dicts, length == n.
    """
    prompt = (
        f"請為教材章節「{chapter.title}」規劃 {n} 個子頁（語言：{language}）。\n\n"
        "只回傳 JSON，格式：\n"
        '{"pages": [{"title": "子頁標題", "slug": "english-slug"}]}\n\n'
        "slug 必須是英文小寫加連字號，不要任何其他文字。"
    )

    for _ in range(2):
        try:
            response = await ollama_svc.chat(
                [{"role": "user", "content": prompt}], settings.default_model
            )
            text = response.message.content or ""
            pages = _parse_pages(text)
            if len(pages) >= n:
                return pages[:n]
        except Exception:
            pass

    return _fallback_pages(n)


async def _gen_readme(chapter: ChapterMeta, pages: list[dict], language: str) -> str:
    """Generate README.md for a chapter using a known page list.

    Args:
        chapter: Chapter metadata.
        pages: Sub-page list with title and slug.
        language: Content language code.

    Returns:
        Markdown string.
    """
    page_links = "\n".join(f"- [{p['title']}]({p['slug']}.md)" for p in pages)
    prompt = (
        f"請生成教材章節的 README.md（語言：{language}）。\n\n"
        f"章節標題：{chapter.title}\n"
        f"章節說明：{chapter.description}\n\n"
        f"子頁目錄（固定，請照這個列表）：\n{page_links}\n\n"
        "格式：\n"
        f"# {chapter.title}\n\n"
        "> （摘要，60-80字）\n\n"
        "## 本章節目\n"
        "（使用上方子頁目錄）\n\n"
        "---\n\n"
        "只回答 markdown 內容，不需要任何說明。"
    )
    response = await ollama_svc.chat(
        [{"role": "user", "content": prompt}], settings.default_model
    )
    return response.message.content or f"# {chapter.title}\n\n{chapter.description}\n"


async def _gen_page(chapter: ChapterMeta, page: dict, grade: str, language: str) -> str:
    """Generate markdown content for one sub-page.

    Args:
        chapter: Parent chapter metadata.
        page: Sub-page info with title and slug.
        grade: Target student grade.
        language: Content language code.

    Returns:
        Markdown string.
    """
    prompt = (
        f"請生成教材文章（語言：{language}，適合{grade}學生）。\n\n"
        f"所屬章節：{chapter.title}\n"
        f"文章標題：{page['title']}\n\n"
        "文章結構：\n"
        "1. H1 標題\n"
        "2. 概念說明（150-250字）\n"
        "3. 範例（至少 3 個）\n"
        "4. 練習題（2-3 題，含答案）\n\n"
        "只回答 markdown 內容，不要任何前言。"
    )
    response = await ollama_svc.chat(
        [{"role": "user", "content": prompt}], settings.default_model
    )
    return response.message.content or f"# {page['title']}\n\n> 內容生成中...\n"


async def generate_chapter(
    chapter: ChapterMeta,
    pages_per_chapter: int,
    language: str,
    grade: str,
) -> dict[str, str]:
    """Generate all markdown files for one chapter.

    Args:
        chapter: Chapter metadata.
        pages_per_chapter: Number of sub-pages to generate.
        language: Content language code.
        grade: Target student grade.

    Returns:
        Dict mapping filename to markdown content, e.g.
        {"README.md": "...", "page-1.md": "..."}.
    """
    pages = await _get_page_list(chapter, pages_per_chapter, language)
    readme = await _gen_readme(chapter, pages, language)

    result: dict[str, str] = {"README.md": readme}

    for i, page in enumerate(pages):
        content = await _gen_page(chapter, page, grade, language)
        slug = page.get("slug") or f"page-{i + 1}"
        result[f"{slug}.md"] = content

    return result
