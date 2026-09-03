import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";
import { PasteClient } from "./PasteClient";

export default function PastePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <SiteHeader />

      <h1 className="mt-8 font-display text-3xl">
        Paste a <code>tools/list</code> response
      </h1>

      <p className="mt-4 text-sm text-muted">
        For a server you can already run — private, unpublished, or just not in
        the index yet. Checking a server before you install it is what the{" "}
        <Link
          href="/"
          className="underline decoration-rule underline-offset-2 hover:text-ink"
        >
          index and server pages
        </Link>{" "}
        are for. This page is for the case where nobody has measured your server
        yet: run it yourself, capture its tool list, and paste the result below.
      </p>

      <p className="mt-2 text-sm text-muted">
        Nothing is uploaded — the analyzer runs in this tab, and the JSON you
        paste never leaves your browser.
      </p>

      <p className="mt-2 text-sm text-muted">
        Analysis runs locally, which means loading the tokenizer — about a
        megabyte, fetched once when this page opens.
      </p>

      <h2 className="mt-8 font-display text-lg">From this repo</h2>
      <p className="mt-2 text-sm text-muted">
        No global install needed — this clones the capture script and runs your
        server as its subprocess:
      </p>
      <pre className="mt-2 overflow-x-auto rounded border border-rule bg-paper px-3 py-2 font-mono text-sm text-ink">
        <code>
          git clone https://github.com/bryanwaine/mcp-context-cost &amp;&amp; cd
          mcp-context-cost &amp;&amp; npm install{"\n"}
          npx tsx scripts/capture.ts --stdout npx -y @your-org/your-server |
          pbcopy
        </code>
      </pre>

      <h2 className="mt-8 font-display text-lg">With the MCP Inspector</h2>
      <p className="mt-2 text-sm text-muted">
        If you&rsquo;d rather not clone anything. The{" "}
        <a
          href="https://modelcontextprotocol.io/docs/tools/inspector/cli"
          target="_blank"
          rel="noopener"
          className="underline decoration-rule underline-offset-2 hover:text-ink"
        >
          MCP Inspector
        </a>
        &rsquo;s CLI mode spawns your server as a plain command, not through a
        package runner — so the server has to be installed globally first:
      </p>
      <pre className="mt-2 overflow-x-auto rounded border border-rule bg-paper px-3 py-2 font-mono text-sm text-ink">
        <code>
          npm i -g @your-org/your-server{"\n"}
          npx @modelcontextprotocol/inspector --cli &lt;server-binary&gt;
          --method tools/list --format json
        </code>
      </pre>
      <p className="mt-2 text-sm text-muted">
        Nesting <code className="font-mono">npx -y &lt;package&gt;</code> inside
        the inspector command doesn&rsquo;t work: the inspector passes its
        remaining arguments straight to whatever it spawns, so the nested{" "}
        <code className="font-mono">npx</code> swallows the inspector&rsquo;s
        own <code className="font-mono">--method</code> flag and the run fails.
        Installing globally avoids the nested{" "}
        <code className="font-mono">npx</code> entirely.
      </p>
      <p className="mt-2 text-sm text-muted">
        The installed binary name is often not the package name — e.g.{" "}
        <code className="font-mono">@playwright/mcp</code> installs as{" "}
        <code className="font-mono">playwright-mcp</code>. Run{" "}
        <code className="font-mono">ls $(npm prefix -g)/bin</code> to see what
        got installed.
      </p>

      <p className="mt-6 text-sm text-muted">
        <code className="font-mono">| pbcopy</code> is macOS; on Linux, pipe to{" "}
        <code className="font-mono">xclip -selection clipboard</code> instead. A
        bare tool array or the raw{" "}
        <code className="font-mono">{'{"tools": [...]}'}</code> capture are also
        accepted, alongside the full{" "}
        <code className="font-mono">tools/list</code> response.
      </p>

      <PasteClient />
    </main>
  );
}
