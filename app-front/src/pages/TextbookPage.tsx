import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { BookMarked, Loader2, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  planTextbook,
  generateTextbook,
  type ChapterMeta,
  type TextbookEvent,
} from "@/lib/api";

// ── Types ──────────────────────────────────────────────

interface Props {
  onOpenDoc: (slug: string) => void;
}

type Phase = "idle" | "planning" | "review" | "generating" | "done";

interface PlanState {
  bookSlug: string;
  chapters: ChapterMeta[];
  pagesPerChapter: number;
  grade: string;
  language: string;
}

interface ChapterProgress {
  slug: string;
  title: string;
  done: boolean;
  files: string[];
}

// ── Component ──────────────────────────────────────────

export default function TextbookPage({ onOpenDoc }: Props) {
  const { t } = useTranslation();

  // Form values
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("國中");
  const [numChapters, setNumChapters] = useState(6);
  const [pagesPerChapter, setPagesPerChapter] = useState(3);

  // Flow state
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [planState, setPlanState] = useState<PlanState | null>(null);
  const [progress, setProgress] = useState<ChapterProgress[]>([]);
  const [doneBook, setDoneBook] = useState<{ slug: string; totalFiles: number } | null>(null);

  const handlePlan = useCallback(async () => {
    if (!topic.trim()) return;
    setError(null);
    setPhase("planning");
    try {
      const resp = await planTextbook({
        topic: topic.trim(),
        grade,
        language: "zh-TW",
        num_chapters: numChapters,
        pages_per_chapter: pagesPerChapter,
      });
      setPlanState({
        bookSlug: resp.book_slug,
        chapters: resp.plan.chapters,
        pagesPerChapter,
        grade,
        language: "zh-TW",
      });
      setPhase("review");
    } catch (e: unknown) {
      setError((e as Error).message ?? t("textbook.errorPlan"));
      setPhase("idle");
    }
  }, [topic, grade, numChapters, pagesPerChapter, t]);

  const handleGenerate = useCallback(async () => {
    if (!planState) return;
    setError(null);
    setProgress(
      planState.chapters.map((ch) => ({ slug: ch.slug, title: ch.title, done: false, files: [] })),
    );
    setPhase("generating");

    try {
      const stream = generateTextbook({
        book_slug: planState.bookSlug,
        plan: { chapters: planState.chapters },
        pages_per_chapter: planState.pagesPerChapter,
        grade: planState.grade,
        language: planState.language,
      });

      for await (const event of stream) {
        handleEvent(event);
      }
    } catch (e: unknown) {
      setError((e as Error).message ?? t("textbook.errorGenerate"));
      setPhase("review");
    }
  }, [planState, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEvent = (event: TextbookEvent) => {
    if (event.event === "chapter_done") {
      setProgress((prev) =>
        prev.map((p) =>
          p.slug === event.chapter_slug ? { ...p, done: true, files: event.files } : p,
        ),
      );
    } else if (event.event === "done") {
      setDoneBook({ slug: event.book_slug, totalFiles: event.files_written.length });
      setPhase("done");
    } else if (event.event === "error") {
      setError(event.message);
      setPhase("review");
    }
  };

  const resetToIdle = () => {
    setPhase("idle");
    setTopic("");
    setPlanState(null);
    setProgress([]);
    setDoneBook(null);
    setError(null);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl">

          {/* Header */}
          <div className="mb-6 flex items-center gap-2">
            <BookMarked className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">{t("textbook.title")}</h1>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* IDLE: input form */}
          {phase === "idle" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("textbook.labelTopic")}
                </label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handlePlan();
                  }}
                  placeholder={t("textbook.placeholderTopic")}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    {t("textbook.labelGrade")}
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="國小">國小</option>
                    <option value="國中">國中</option>
                    <option value="高中">高中</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    {t("textbook.labelChapters")}
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={12}
                    value={numChapters}
                    onChange={(e) => setNumChapters(Math.max(3, Math.min(12, Number(e.target.value))))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    {t("textbook.labelPages")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={pagesPerChapter}
                    onChange={(e) => setPagesPerChapter(Math.max(1, Math.min(6, Number(e.target.value))))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <button
                onClick={() => void handlePlan()}
                disabled={!topic.trim()}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles size={15} />
                {t("textbook.btnPlan")}
              </button>
            </div>
          )}

          {/* PLANNING: spinner */}
          {phase === "planning" && (
            <div className="flex items-center gap-3 py-16 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">{t("textbook.msgPlanning")}</span>
            </div>
          )}

          {/* REVIEW: chapter preview + confirm */}
          {phase === "review" && planState && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 font-mono text-xs text-muted-foreground">
                  {planState.bookSlug}
                </p>
                <ul className="space-y-2.5">
                  {planState.chapters.map((ch) => (
                    <li key={ch.id} className="flex items-start gap-2 text-sm">
                      <ChevronRight size={14} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <span className="font-medium">{ch.title}</span>
                        <p className="mt-0.5 text-xs text-muted-foreground">{ch.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPhase("idle")}
                  className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  {t("textbook.btnBack")}
                </button>
                <button
                  onClick={() => void handleGenerate()}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Sparkles size={15} />
                  {t("textbook.btnGenerate")}
                </button>
              </div>
            </div>
          )}

          {/* GENERATING: progress list */}
          {phase === "generating" && (
            <div className="space-y-2">
              <p className="mb-3 text-sm text-muted-foreground">{t("textbook.msgGenerating")}</p>
              {progress.map((ch) => (
                <div
                  key={ch.slug}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                    ch.done
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-border bg-muted/20",
                  )}
                >
                  {ch.done ? (
                    <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                  ) : (
                    <Loader2 size={16} className="shrink-0 animate-spin text-muted-foreground" />
                  )}
                  <span className={cn("flex-1", ch.done && "text-foreground")}>
                    {ch.title}
                  </span>
                  {ch.done && (
                    <span className="text-xs text-muted-foreground">
                      {ch.files.length} 個檔案
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* DONE: success */}
          {phase === "done" && doneBook && (
            <div className="flex flex-col items-center gap-5 py-16 text-center">
              <CheckCircle2 size={48} className="text-green-500" />
              <div>
                <h2 className="text-base font-semibold">{t("textbook.msgDone")}</h2>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{doneBook.slug}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {doneBook.totalFiles} 個檔案已生成
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={resetToIdle}
                  className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  {t("textbook.btnNew")}
                </button>
                <button
                  onClick={() => onOpenDoc(doneBook.slug)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <BookMarked size={15} />
                  {t("textbook.btnView")}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
