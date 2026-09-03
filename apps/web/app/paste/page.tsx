import Link from "next/link";
import { ThemeToggle } from "../components/ThemeToggle";
import { PasteClient } from "./PasteClient";

export default function PastePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between border-b border-rule pb-4">
        <Link
          href="/"
          className="text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-measure"
        >
          <span className="mr-2 font-bold">⇦</span> All servers
        </Link>
        <ThemeToggle />
      </div>

      <h1 className="mt-8 font-display text-3xl">
        Paste a tools/list response
      </h1>

      <p className="mt-4 text-sm text-muted">
        For servers not in the registry, or private ones. Nothing is uploaded —
        the analyzer runs in this tab, and the JSON you paste never leaves your
        browser.
      </p>

      <p className="mt-6 text-sm text-muted">
        Get it from the{" "}
        <a
          href="https://modelcontextprotocol.io/docs/tools/inspector/cli"
          target="_blank"
          rel="noopener"
          className="underline decoration-rule underline-offset-2 hover:text-ink"
        >
          MCP Inspector
        </a>
        &rsquo; CLI mode:
      </p>
      <pre className="mt-2 overflow-x-auto rounded border border-rule bg-paper px-3 py-2 font-mono text-sm text-ink">
        <code>
          npx @modelcontextprotocol/inspector --cli &lt;command&gt; [args...]{" "}
          --method tools/list --format json
        </code>
      </pre>
      <p className="mt-2 text-sm text-muted">
        e.g. for an npm-published server:
      </p>
      <pre className="mt-2 overflow-x-auto rounded border border-rule bg-paper px-3 py-2 font-mono text-sm text-ink">
        <code>
          npx @modelcontextprotocol/inspector --cli npx -y @your-org/your-server
          --method tools/list --format json
        </code>
      </pre>
      <p className="mt-2 text-sm text-muted">
        On macOS, append <code className="font-mono">| pbcopy</code> to copy the
        output directly. A bare tool array or the raw{" "}
        <code className="font-mono">{'{"tools": [...]}'}</code> capture also
        work.
      </p>

      <PasteClient />
    </main>
  );
}
