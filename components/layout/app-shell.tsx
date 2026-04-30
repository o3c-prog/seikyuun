"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

function BackgroundDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-0 left-64 z-0 h-56 w-64 select-none overflow-hidden opacity-60"
    >
      <span className="absolute -bottom-10 left-2 size-32 rounded-full bg-violet-200/30 blur-2xl" />
      <span className="absolute bottom-16 left-20 size-24 rounded-full bg-emerald-200/30 blur-2xl" />
      <svg
        className="absolute bottom-2 left-12 h-24 w-24"
        viewBox="0 0 160 160"
        fill="none"
      >
        <path
          d="M30 150 C 30 100, 50 70, 90 60"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <ellipse cx="60" cy="105" rx="14" ry="6" fill="#a7f3d0" opacity="0.6" transform="rotate(-30 60 105)" />
        <ellipse cx="80" cy="80" rx="14" ry="6" fill="#6ee7b7" opacity="0.6" transform="rotate(-50 80 80)" />
        <ellipse cx="95" cy="60" rx="12" ry="5" fill="#a7f3d0" opacity="0.6" transform="rotate(-70 95 60)" />
      </svg>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isPrint = pathname.startsWith("/print");

  if (isPrint) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen">
      <Sidebar />
      <main className="relative flex-1 overflow-x-hidden bg-background">
        <BackgroundDecor />
        <div className="relative z-[1]">{children}</div>
      </main>
    </div>
  );
}
