import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.textbook import generator, planner, writer
from app.textbook.planner import TextbookPlanError
from app.textbook.schemas import GenerateRequest, PlanRequest, PlanResponse

router = APIRouter(prefix="/textbook", tags=["textbook"])

DOCS_DIR = (Path(__file__).parent.parent.parent.parent / "docs").resolve()


@router.post("/plan", response_model=PlanResponse)
async def plan_textbook(req: PlanRequest) -> PlanResponse:
    """Generate a chapter plan for the given topic without writing files.

    Args:
        req: Topic, grade, language, and chapter count.

    Returns:
        PlanResponse with book_slug and chapters list.

    Raises:
        HTTPException: 502 if AI fails to produce a valid plan.
    """
    try:
        book_slug, plan = await planner.generate_plan(req)
        return PlanResponse(book_slug=book_slug, plan=plan)
    except TextbookPlanError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/generate")
async def generate_textbook(req: GenerateRequest) -> StreamingResponse:
    """Generate markdown content for each chapter and write to docs directory.

    Streams SSE events as each chapter completes.  Final event is "done" or
    "error".

    Args:
        req: Confirmed plan plus generation parameters.

    Returns:
        text/event-stream response with chapter_done / done / error events.
    """

    async def _stream():
        chapters_content: dict[str, dict[str, str]] = {}

        for chapter in req.plan.chapters:
            try:
                pages = await generator.generate_chapter(
                    chapter, req.pages_per_chapter, req.language, req.grade
                )
            except Exception as exc:  # noqa: BLE001
                pages = {"README.md": f"# {chapter.title}\n\n> 生成錯誤：{exc}\n"}

            chapters_content[chapter.slug] = pages
            event = {
                "event": "chapter_done",
                "chapter_slug": chapter.slug,
                "chapter_title": chapter.title,
                "files": list(pages.keys()),
            }
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

        try:
            files = await writer.write_book(DOCS_DIR, req.book_slug, req.plan, chapters_content)
            done_event: dict = {
                "event": "done",
                "book_slug": req.book_slug,
                "files_written": files,
            }
        except Exception as exc:  # noqa: BLE001
            done_event = {"event": "error", "message": str(exc)}

        yield f"data: {json.dumps(done_event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
