import asyncio
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/docs", tags=["docs"])

DOCS_DIR = (Path(__file__).parent.parent.parent.parent / "docs").resolve()


# ── Models ─────────────────────────────────────────────

class DocResponse(BaseModel):
    title: str
    content: str


class PageInfo(BaseModel):
    slug: str
    title: str


class ChapterInfo(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    pages: list[PageInfo]


class BookResponse(BaseModel):
    book: str
    chapters: list[ChapterInfo]


# ── Helpers ────────────────────────────────────────────

def _extract_title(content: str, fallback: str) -> str:
    return next(
        (line.lstrip("# ").strip() for line in content.splitlines() if line.startswith("# ")),
        fallback,
    )


def _safe_resolve(path: Path, root: Path) -> Path:
    """Resolve path and assert it stays within root to prevent traversal.

    Args:
        path: Candidate path to resolve.
        root: Allowed root directory.

    Returns:
        Resolved absolute path.

    Raises:
        HTTPException: 400 if path escapes root.
    """
    resolved = path.resolve()
    try:
        resolved.relative_to(root)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    return resolved


def _read_doc(path: str) -> DocResponse:
    """Read a markdown file from DOCS_DIR.

    Args:
        path: Relative path without .md extension (e.g. ``intro`` or
            ``Claude-Code-使用手冊/hooks-automation/README``).

    Returns:
        DocResponse with H1-derived title and raw markdown content.

    Raises:
        HTTPException: 400 for traversal, 404 if not found.
    """
    file = _safe_resolve(DOCS_DIR / f"{path}.md", DOCS_DIR)
    if not file.is_file():
        raise HTTPException(status_code=404, detail=f"Doc '{path}' not found")
    content = file.read_text(encoding="utf-8")
    return DocResponse(title=_extract_title(content, path), content=content)


def _build_book(book: str) -> BookResponse:
    """Build a full book tree from chapters.json + per-chapter directory scan.

    Args:
        book: Directory name of the book under DOCS_DIR.

    Returns:
        BookResponse with each chapter's page list (README first, then alpha).

    Raises:
        HTTPException: 400 for traversal, 404 if book or chapters.json missing.
    """
    book_dir = _safe_resolve(DOCS_DIR / book, DOCS_DIR)
    if not book_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Book '{book}' not found")

    chapters_file = book_dir / "chapters.json"
    if not chapters_file.is_file():
        raise HTTPException(status_code=404, detail="chapters.json not found")

    raw: list[dict] = json.loads(chapters_file.read_text(encoding="utf-8"))["chapters"]

    chapters: list[ChapterInfo] = []
    for ch in raw:
        ch_dir = book_dir / ch["slug"]
        pages: list[PageInfo] = []

        if ch_dir.is_dir():
            md_files = sorted(
                ch_dir.glob("*.md"),
                key=lambda f: (f.stem != "README", f.stem),
            )
            for md_file in md_files:
                content = md_file.read_text(encoding="utf-8")
                pages.append(PageInfo(
                    slug=md_file.stem,
                    title=_extract_title(content, md_file.stem),
                ))

        chapters.append(ChapterInfo(
            id=ch["id"],
            title=ch["title"],
            slug=ch["slug"],
            description=ch["description"],
            pages=pages,
        ))

    return BookResponse(book=book, chapters=chapters)


# ── Routes ─────────────────────────────────────────────

@router.get("/books/{book}", response_model=BookResponse)
async def get_book(book: str) -> BookResponse:
    """Return the full chapter tree for a book.

    Args:
        book: Directory name of the book under DOCS_DIR (URL-decoded by FastAPI).

    Returns:
        BookResponse with ordered chapters and their page lists.

    Raises:
        HTTPException: 400 for path traversal, 404 if book or chapters.json not found.
    """
    return await asyncio.to_thread(_build_book, book)


@router.get("/content/{path:path}", response_model=DocResponse)
async def get_doc(path: str) -> DocResponse:
    """Serve a single markdown file as structured content.

    Args:
        path: Relative path without .md extension, e.g.
            ``Claude-Code-使用手冊/hooks-automation/README``.

    Returns:
        DocResponse with title and raw markdown.

    Raises:
        HTTPException: 400 for path traversal, 404 if file not found.
    """
    return await asyncio.to_thread(_read_doc, path)
