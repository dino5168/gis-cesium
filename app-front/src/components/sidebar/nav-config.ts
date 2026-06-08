import { MessageSquare, LayoutDashboard, LayoutGrid, PieChart, BookOpen, Wrench, BookMarked, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItemKey =
  | "chat" | "docs" | "tools" | "textbook" | "cesium"
  | "dashboard" | "overview" | "stats";

interface LeafNavItem {
  key: NavItemKey;
  label: string;
  icon: LucideIcon;
  children?: never;
}

interface ParentNavItem {
  key: NavItemKey;
  label: string;
  icon: LucideIcon;
  children: LeafNavItem[];
}

export type NavItem = LeafNavItem | ParentNavItem;

export interface NavSection {
  title: string;
  items: NavItem[];
}

export function isParentNavItem(item: NavItem): item is ParentNavItem {
  return Array.isArray(item.children);
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "sidebar.mainMenu",
    items: [
      { key: "chat", label: "nav.chat", icon: MessageSquare },
      { key: "docs",  label: "nav.docs",  icon: BookOpen },
      { key: "tools",     label: "nav.tools",     icon: Wrench      },
      { key: "textbook",  label: "nav.textbook",  icon: BookMarked  },
      { key: "cesium",    label: "nav.cesium",    icon: Globe       },
      {
        key: "dashboard", label: "nav.dashboard", icon: LayoutDashboard,
        children: [
          { key: "overview", label: "nav.overview", icon: LayoutGrid },
          { key: "stats",    label: "nav.stats",    icon: PieChart   },
        ],
      },
    ],
  },
];
