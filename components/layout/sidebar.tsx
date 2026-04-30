"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

function BrandLogo() {
  return (
    <Image
      src="/logo.png"
      alt="セイキューン!"
      width={1536}
      height={1024}
      className="w-full h-auto"
      priority
    />
  );
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "メニュー",
    items: [
      { label: "案件管理", href: "/projects", icon: FolderKanban },
      { label: "顧客管理", href: "/clients", icon: Users },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4">
        <BrandLogo />
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "bg-emerald-50 text-emerald-900"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute -left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-teal-400"
                        />
                      )}
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-lg transition-colors",
                          active
                            ? "bg-emerald-100 text-teal-600"
                            : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
