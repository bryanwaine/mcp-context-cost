"use client";

import { useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function applyPreference(preference: ThemePreference): void {
  // Attribute first, outside the try: if storage is unavailable (Safari
  // private mode throws on access), the theme should still switch for this
  // session even though the choice won't persist.
  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", preference);
  }

  try {
    if (preference === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", preference);
    }
  } catch {
    // Storage unavailable; the attribute above still applies for this session.
  }
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") {
      setPreference(current);
    }
  }, []);

  return (
    <div className="inline-flex overflow-hidden rounded-full border border-rule text-sm">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            applyPreference(value);
            setPreference(value);
          }}
          aria-pressed={preference === value}
          className={`px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-measure ${
            preference === value ? "bg-ink text-paper" : "text-muted hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}