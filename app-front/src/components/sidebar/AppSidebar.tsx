import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { Menu, ChevronRight, ChevronDown, Settings, User, Sun, Monitor, Moon, Waves, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_SECTIONS, isParentNavItem } from "./nav-config";
import type { NavItemKey } from "./nav-config";

function SidebarTooltip({ label, show, children }: {
  label: string;
  show: boolean;
  children: React.ReactElement;
}) {
  if (!show) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

type Theme = "system" | "light" | "dark" | "dark-blue";
type Language = "zh-TW" | "en";

interface AppSidebarProps {
  readonly className?: string;
  readonly activeItem: NavItemKey;
  readonly onActiveChange: (key: NavItemKey) => void;
}

export function AppSidebar({ className, activeItem, onActiveChange }: AppSidebarProps) {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<NavItemKey>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) ?? "system",
  );
  const [activeAccordion, setActiveAccordion] = useState<"theme" | "lang" | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (key: NavItemKey) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  useLayoutEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = (prefersDark: boolean) => {
      root.classList.remove("dark", "dark-blue");
      if (theme === "dark") root.classList.add("dark");
      else if (theme === "dark-blue") root.classList.add("dark-blue");
      else if (theme === "system" && prefersDark) root.classList.add("dark");
    };

    localStorage.setItem("theme", theme);
    apply(mq.matches);

    if (theme === "system") {
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
        setActiveAccordion(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const closePopup = () => {
    setSettingsOpen(false);
    setActiveAccordion(null);
  };

  const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "system",    label: t("sidebar.themeSystem"),   icon: <Monitor size={14} /> },
    { value: "light",     label: t("sidebar.themeLight"),    icon: <Sun size={14} /> },
    { value: "dark",      label: t("sidebar.themeDark"),     icon: <Moon size={14} /> },
    { value: "dark-blue", label: t("sidebar.themeDarkBlue"), icon: <Waves size={14} /> },
  ];

  const LANG_OPTIONS: { value: Language; label: string }[] = [
    { value: "zh-TW", label: "繁體中文" },
    { value: "en",    label: "English"  },
  ];

  const currentLang = i18n.language as Language;

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3">
        {!collapsed && (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              十方
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{t("sidebar.appName")}</p>
              <p className="truncate text-xs text-muted-foreground">{t("sidebar.appSubtitle")}</p>
            </div>
          </>
        )}
        <SidebarTooltip label={t("sidebar.expandSidebar")} show={collapsed}>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "mx-auto",
            )}
            aria-label={t(collapsed ? "sidebar.expandSidebar" : "sidebar.collapseSidebar")}
          >
            <Menu size={20} />
          </button>
        </SidebarTooltip>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.title} className={cn(si > 0 && "mt-1")}>
            {si > 0 && <div className="mx-1 my-3 border-t border-sidebar-border" />}

            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t(section.title)}
              </p>
            )}

            {section.items.map((item) => {
              const isActive = activeItem === item.key;
              const isExpanded = expandedItems.has(item.key as NavItemKey);
              const isParent = isParentNavItem(item);
              const Icon = item.icon;

              return (
                <div key={item.key}>
                  <SidebarTooltip label={t(item.label)} show={collapsed}>
                    <button
                      onClick={() => {
                        if (isParent && !collapsed) toggleExpand(item.key as NavItemKey);
                        onActiveChange(item.key as NavItemKey);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon
                        size={18}
                        className={cn("shrink-0", isActive ? "text-sidebar-accent-foreground" : "text-muted-foreground")}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate text-left">{t(item.label)}</span>
                          {isParent && (
                            isExpanded
                              ? <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                              : <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                          )}
                        </>
                      )}
                    </button>
                  </SidebarTooltip>

                  {isParent && !collapsed && isExpanded && (
                    <div className="ml-4 mt-0.5 border-l border-sidebar-border pl-3">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = activeItem === child.key;
                        return (
                          <button
                            key={child.key}
                            onClick={() => onActiveChange(child.key as NavItemKey)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                              isChildActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                            )}
                          >
                            <ChildIcon size={15} className="shrink-0" />
                            <span className="truncate text-left">{t(child.label)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div ref={settingsRef} className="relative shrink-0 border-t border-sidebar-border">
        {/* Settings popup */}
        {settingsOpen && (
          <div className={cn(
            "absolute z-50 rounded-lg border border-sidebar-border bg-sidebar shadow-lg overflow-hidden",
            collapsed
              ? "bottom-0 left-full ml-2 w-56"
              : "bottom-full left-0 right-0 mx-2 mb-1",
          )}>
            {/* 主題 */}
            <button
              onClick={() => setActiveAccordion((v) => v === "theme" ? null : "theme")}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Sun size={15} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 text-left">{t("sidebar.theme")}</span>
              <ChevronRight
                size={13}
                className={cn("shrink-0 text-muted-foreground transition-transform", activeAccordion === "theme" && "rotate-90")}
              />
            </button>
            {activeAccordion === "theme" && (
              <div className="border-t border-sidebar-border bg-sidebar-accent/30">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setTheme(opt.value); closePopup(); }}
                    className={cn(
                      "flex w-full items-center gap-3 px-5 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      theme === opt.value
                        ? "text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/70",
                    )}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                    {theme === opt.value && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 語言 */}
            <button
              onClick={() => setActiveAccordion((v) => v === "lang" ? null : "lang")}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Globe size={15} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 text-left">{t("sidebar.language")}</span>
              <ChevronRight
                size={13}
                className={cn("shrink-0 text-muted-foreground transition-transform", activeAccordion === "lang" && "rotate-90")}
              />
            </button>
            {activeAccordion === "lang" && (
              <div className="border-t border-sidebar-border bg-sidebar-accent/30">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { void i18n.changeLanguage(opt.value); closePopup(); }}
                    className={cn(
                      "flex w-full items-center gap-3 px-5 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      currentLang === opt.value
                        ? "text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/70",
                    )}
                  >
                    <span>{opt.label}</span>
                    {currentLang === opt.value && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-sidebar-border" />

            {/* 設定 */}
            <button className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Settings size={15} className="shrink-0 text-muted-foreground" />
              <span className="text-left">{t("sidebar.settings")}</span>
            </button>
          </div>
        )}

        {/* Footer bar */}
        <div className="flex items-center gap-2 px-3 py-3">
          {!collapsed && (
            <>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground">
                <User size={15} />
              </div>
              <span className="flex-1 truncate text-sm text-sidebar-foreground/80">{t("sidebar.user")}</span>
            </>
          )}
          <SidebarTooltip label={t("sidebar.settings")} show={collapsed}>
            <button
              onClick={() => { setSettingsOpen((v) => !v); if (settingsOpen) setActiveAccordion(null); }}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed && "mx-auto",
                settingsOpen && "bg-sidebar-accent text-sidebar-foreground",
              )}
              aria-label={t("sidebar.settings")}
            >
              <Settings size={16} />
            </button>
          </SidebarTooltip>
        </div>
      </div>
    </aside>
  );
}
