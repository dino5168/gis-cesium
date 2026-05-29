from pydantic import BaseModel


class ChapterMeta(BaseModel):
    id: int
    title: str
    slug: str
    description: str


class ChaptersJson(BaseModel):
    chapters: list[ChapterMeta]


class PlanRequest(BaseModel):
    topic: str
    grade: str = "國中"
    language: str = "zh-TW"
    num_chapters: int = 6
    pages_per_chapter: int = 3


class PlanResponse(BaseModel):
    book_slug: str
    plan: ChaptersJson


class GenerateRequest(BaseModel):
    book_slug: str
    plan: ChaptersJson
    pages_per_chapter: int = 3
    grade: str = "國中"
    language: str = "zh-TW"


class GenerateResult(BaseModel):
    book_slug: str
    files_written: list[str]
