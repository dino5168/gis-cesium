import { MessageSquare,LayoutDashboard,LayoutGrid,PieChart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItemKey = "chat";

interface LeafNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  children?: never;
}

interface ParentNavItem {
  key: string;
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
