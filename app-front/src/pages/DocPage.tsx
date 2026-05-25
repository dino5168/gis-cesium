import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronRight, ChevronDown, FileText, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────

interface PageInfo {
  slug: string;
  title: string;
}

interface ChapterInfo {
  id: number;
  title: string;
  slug: string;
  description: string;
  pages: PageInfo[];
}

interface BookData {
  book: string;
  chapters: ChapterInfo[];
}

interface DocContentData {
  title: string;
  content: string;
}

// ── Constants ──────────────────────────────────────────

const API = "http://localhost:8000";
const TREE_MIN = 160;
const TREE_MAX = 480;
const TREE_DEFAULT = 256;

// ── Helpers ────────────────────────────────────────────

const encodePath = (path: string) =>
  path.split("/").map(encodeURIComponent).join("/");

// ── DocTree ────────────────────────────────────────────

interface DocTreeProps {
  book: BookData;
  bookPath: string;
  activePath: string;
  expandedChapters: Set<string>;
  onToggleChapter: (slug: string) => void;
  onSelectPage: (path: string) => void;
}

function DocTree({
  book,
  bookPath,
  activePath,
  expandedChapters,
  onToggleChapter,
  onSelectPage,
}: DocTreeProps) {
  return (
    <nav className="h-full w-full overflow-y-auto py-2">
      {book.chapters.map((chapter) => {
        const isExpanded = expandedChapters.has(chapter.slug);
        const chapterPrefix = `${bookPath}/${chapter.slug}/`;
        const isChapterActive = activePath.startsWith(chapterPrefix);

        return (
          <div key={chapter.slug}>
            <button
              onClick={() => {
                onToggleChapter(chapter.slug);
                onSelectPage(`${chapterPrefix}README`);
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                isChapterActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {isExpanded
                ? <ChevronDown size={13} className="shrink-0" />
                : <ChevronRight size={13} className="shrink-0" />}
              <BookOpen size={13} className="shrink-0" />
              <span className="flex-1 truncate text-left">{chapter.title}</span>
            </button>

            {isExpanded && (
              <div className="ml-3 border-l border-border pl-2 py-0.5">
                {chapter.pages.map((page) => {
                  const pagePath = `${chapterPrefix}${page.slug}`;
                  const isActive = activePath === pagePath;
                  return (
                    <button
                      key={page.slug}
                      onClick={() => onSelectPage(pagePath)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <FileText size={11} className="shrink-0" />
                      <span className="truncate text-left">{page.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ── DocContent ─────────────────────────────────────────

function DocContent({ activePath }: { activePath: string }) {
  const [doc, setDoc] = useState<DocContentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDoc(null);
    setError(null);

    fetch(`${API}/docs/content/${encodePath(activePath)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json() as Promise<DocContentData>;
      })
      .then(setDoc)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "載入失敗");
      });
  }, [activePath]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">載入失敗：{error}</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">載入中…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto">
      <article className="prose dark:prose-invert max-w-3xl mx-auto px-8 py-10">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {doc.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}

// ── DocPage ────────────────────────────────────────────

interface DocPageProps {
  readonly bookPath: string;
}

export default function DocPage({ bookPath }: DocPageProps) {
  const [book, setBook] = useState<BookData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePath, setActivePath] = useState("");
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [treeWidth, setTreeWidth] = useState(TREE_DEFAULT);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startWidth: 0 });

  useEffect(() => {
    fetch(`${API}/docs/books/${encodeURIComponent(bookPath)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json() as Promise<BookData>;
      })
      .then((data) => {
        setBook(data);
        const first = data.chapters[0];
        if (first) {
          setExpandedChapters(new Set([first.slug]));
          setActivePath(`${bookPath}/${first.slug}/README`);
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "載入失敗");
      });
  }, [bookPath]);

  const toggleChapter = (slug: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startWidth: treeWidth };

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - dragRef.current.startX;
      setTreeWidth(Math.min(TREE_MAX, Math.max(TREE_MIN, dragRef.current.startWidth + delta)));
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">載入失敗：{error}</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">載入中…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* 拖曳時的全畫面透明遮罩，確保 cursor 不因滑過其他元素而跳回 */}
      {isDragging && <div className="fixed inset-0 z-50 cursor-col-resize select-none" />}

      {/* 左欄 Tree */}
      <div className="shrink-0 overflow-hidden border-r border-border" style={{ width: treeWidth }}>
        <DocTree
          book={book}
          bookPath={bookPath}
          activePath={activePath}
          expandedChapters={expandedChapters}
          onToggleChapter={toggleChapter}
          onSelectPage={setActivePath}
        />
      </div>

      {/* Splitter Bar */}
      <div
        onMouseDown={handleSplitterMouseDown}
        className={cn(
          "w-1 shrink-0 cursor-col-resize transition-colors",
          isDragging ? "bg-primary/60" : "bg-transparent hover:bg-border",
        )}
      />

      {/* 右欄 Content */}
      {activePath && <DocContent activePath={activePath} />}
    </div>
  );
}
