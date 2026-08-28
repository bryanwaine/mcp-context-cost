# mcp-context-cost

Every MCP server you connect spends part of your context window before the agent
does any work. The tool definitions have to be sent to the model on every single
request, whether or not a tool is ever called.

This project measures that cost for published servers, so you can check it
**before** you connect one.

---

## The measurement

Three servers, captured directly from their `tools/list` response:

| Server | Tools | Total tokens | Tokens per tool |
|---|---:|---:|---:|
| `@playwright/mcp` | 24 | 4,005 | 167 |
| `@modelcontextprotocol/server-filesystem` | 14 | 2,793 | 200 |
| `@upstash/context7-mcp` | 2 | 1,050 | **525** |

Connect all three and you have spent 7,848 tokens — about 3.9% of a 200k
context window — before the model reads a single line of your actual problem.

### The two rankings invert

Ranked by total cost: playwright, filesystem, context7.

Ranked by cost per tool: context7, filesystem, playwright.

That inversion is the whole point of this project. The two rankings measure
different failures, and conflating them into one score hides both.

**Playwright is expensive because it is large.** 24 tools covering navigation,
form filling, screenshots, keyboard and mouse, and tab management, each written
tightly at 167 tokens. You cannot do browser automation with four tools. This is
a scope decision, and defensible.

**Context7 is expensive because it is verbose.** Two tools carrying 525 tokens
each — 3.1× playwright's per-tool cost. Nothing about the capability requires
that. This is an authoring problem, and it is fixable without removing a single
feature.

The advice differs completely. To a Context7 user: this server wastes your
context, open an issue. To a playwright user: this server is fine, but connect
it alongside three others and budget accordingly.

This is also why there is deliberately **no single score** here. Any composite
metric has to weight these two axes arbitrarily, and most weightings would rank
Context7, the worst-authored server measured so far, as the cheapest.

### Independent reproduction

The `mcp-checkup` project reported that Context7's tool descriptions cost roughly
three times more tokens than necessary. This project measured 3.1× playwright's
per-tool cost, using a different tokenizer, on a different day, without having
read their methodology first.

Two independent measurements landing on the same multiple is worth more than
either one alone.

---

## Methodology

Fundamentally, the numbers are the core deliverable.

**Metric** **-** For each tool returned by `tools/list`, the token count of
`JSON.stringify({ name, description, inputSchema })` is captured. This approximates what a
host actually sends to the model. It excludes per-request framing overhead added
by the host, so real-world cost is somewhat higher than reported here.

**Tokenizer** **-** `gpt-tokenizer` with the `o200k_base` encoding. This is
OpenAI's tokenizer, **not Anthropic's.** The figures are approximations and are
labelled as such everywhere they appear. Anthropic's `count_tokens` endpoint will
be used to publish an error margin.

**Data sources** **-** Captured from live servers via
`scripts/capture.ts` and committed verbatim to `packages/analyzer/fixtures/real/`.
Nothing is generated at request time. The raw JSON is in the repository, so any
number here can be recomputed independently.

**Coverage** **-** Comprehensive coverage is fundamentally unattainable. Servers requiring authentication, or
distributed only as containers, are harder to capture. The site reports how many
servers have been measured, but never implies it covers the ecosystem.

---

## An open prediction

Recorded before measuring, so it can be wrong.

A widely-cited figure puts GitHub's official MCP server at 17,600 tokens of tool
definitions per request. It comes from a vendor selling a tool-search product
that reduces exactly this cost, so it deserves independent checking.

At the ~196 tokens-per-tool average observed across the three servers here,
17,600 tokens implies roughly **90 tools**.

If that holds, GitHub is a *scope* story, not a *bloat* story. The loudest
number in the ecosystem would turn out to be evidence of surface area rather
than waste, and the framing above predicted it.

If GitHub instead comes in at a high per-tool cost, that is a genuinely bloated
server at scale, which is a more interesting finding.

Either result is worth more than a number measured after the answer was known.
The capture and the outcome will be added here unedited.

---

## Key exclusions

Existing solutions to a similar problem:

- **[mcp-checkup](https://github.com/cheslip/mcp-checkup)** — grades the servers
  in your local config, detects duplicates, emits an optimization report.
- **[mcp-tool-card-linter](https://github.com/wanwanni/mcp-tool-card-linter)** —
  a CI quality gate for server authors, with security checks for tool poisoning.

Both are excellent, and both are **post-install**: you point them at a server you
have already decided to use.

This project is **pre-install**. No installation, no local config, no CLI. You
look a server up the way you look up a package on Bundlephobia, before committing
to it.

---

## Status

Early. Three servers measured, analyzer under construction.

- [x] Capture pipeline (`scripts/capture.ts`)
- [x] Token counting validated against real fixtures
- [ ] Analyzer rules
- [ ] Static site
- [ ] Anthropic tokenizer error margin
- [ ] GitHub capture

---

## Development

```bash
npm install

# Capture a server's tool manifest into fixtures/real/
npx tsx scripts/capture.ts <name> <command> [args...]
npx tsx scripts/capture.ts playwright npx -y @playwright/mcp@latest

# Token counts for a captured fixture
npx tsx scripts/count.ts

npm test
```

The repo is ESM (`"type": "module"` at the root). Config files must use
`export default` or be named `.cjs`.

`packages/analyzer` is pure TypeScript with no I/O — it is bundled into the
browser. Anything touching the filesystem or network belongs in `scripts/`.

MIT.
