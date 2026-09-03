"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-measure";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/search", label: "search" },
  { href: "/paste", label: "paste" },
];

function linkClass(active: boolean): string {
  return `${active ? "text-ink" : "text-muted hover:text-ink"} ${FOCUS_RING}`;
}

// next.config.ts sets trailingSlash: true, so usePathname() returns "/search/"
// rather than "/search" — strip it (except for "/" itself) before comparing.
function normalize(path: string): string {
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

export function SiteHeader() {
  const pathname = normalize(usePathname());
  const isHome = pathname === "/";

  const wordmarkLink = (
    <Link
      href="/"
      aria-current={isHome ? "page" : undefined}
      className={`font-display text-lg ${linkClass(isHome)}`}
    >
      mcp-context-cost
    </Link>
  );

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-rule pb-4">
      <nav className="flex flex-wrap items-center gap-4">
        {isHome ? <h1 className="inline">{wordmarkLink}</h1> : wordmarkLink}
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`text-sm ${linkClass(pathname === href)}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}
