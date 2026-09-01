import type { ReactNode } from "react";
import {
  Bricolage_Grotesque,
  Martian_Mono,
  Public_Sans,
} from "next/font/google";
import "./globals.css";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "600",
  variable: "--display-font",
});

const bodyFont = Public_Sans({
  subsets: ["latin"],
  variable: "--body-font",
});

const monoFont = Martian_Mono({
  subsets: ["latin"],
  variable: "--mono-font",
});

const NO_FLASH_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Must be inline and synchronous in <head>: next/script runs after first
    paint, which is exactly the flash this prevents. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
