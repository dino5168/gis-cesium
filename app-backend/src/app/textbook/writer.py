import asyncio
import json
from pathlib import Path

from app.textbook.schemas import ChaptersJson


def _write_sync(
    docs_root: Path,
    book_slug: str,
    plan: ChaptersJson,
    chapters_content: dict[str, dict[str, str]],
) -> list[str]:
    """Write all book files to disk.

    Args:
        docs_root: Root docs directory.
        book_slug: Directory name for this book.
        plan: Chapter metadata list.
        chapters_content: Mapping of chapter_slug → {filename → content}.

    Returns:
        List of relative paths written (relative to docs_root).
    """
    book_dir = docs_root / book_slug
    book_dir.mkdir(parents=True, exist_ok=True)

    chapters_file = book_dir / "chapters.json"
    chapters_file.write_text(
        json.dumps(
            {"chapters": [ch.model_dump() for ch in plan.chapters]},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    files: list[str] = [f"{book_slug}/chapters.json"]

    for chapter in plan.chapters:
        ch_dir = book_dir / chapter.slug
        ch_dir.mkdir(exist_ok=True)
        content_map = chapters_content.get(chapter.slug, {})
        for filename, content in content_map.items():
            (ch_dir / filename).write_text(content, encoding="utf-8")
            files.append(f"{book_slug}/{chapter.slug}/{filename}")

    return files


async def write_book(
    docs_root: Path,
    book_slug: str,
    plan: ChaptersJson,
    chapters_content: dict[str, dict[str, str]],
) -> list[str]:
    """Async wrapper around _write_sync.

    Args:
        docs_root: Root docs directory.
        book_slug: Directory name for this book.
        plan: Chapter metadata list.
        chapters_content: Mapping of chapter_slug → {filename → content}.

    Returns:
        List of relative paths written.
    """
    return await asyncio.to_thread(_write_sync, docs_root, book_slug, plan, chapters_content)
