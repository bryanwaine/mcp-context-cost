# mcp-context-cost

Every MCP server you connect spends part of your context window before the agent does any work. The tool definitions have to be sent to the model on every single request, whether or not a tool is ever called.

This project measures that cost for published servers, so you can check it **before** you connect one.

Live link - **[mcp-context-cost](https://mcp-context-cost.vercel.app/)**

---

## The measurement

Twelve servers, captured directly from their `tools/list` response, sorted by cost per tool:

| Server | Tools | Total tokens | Tokens per tool |
|---|---:|---:|---:|
| `@upstash/context7-mcp` | 2 | 1,052 | **526** |
| `@antv/mcp-server-chart` | 27 | **14,021** | **519** |
| `firecrawl-mcp` | 25 | 8,499 | 340 |
| `next-devtools-mcp` | 4 | 1,317 | 329 |
| `mongodb-mcp-server` | 27 | 7,877 | 292 |
| `@questdb/mcp-server-questdb` | 35 | 8,915 | 255 |
| `@mapbox/mcp-docs-server` | 3 | 621 | 207 |
| `@modelcontextprotocol/server-filesystem` | 14 | 2,795 | 200 |
| `chrome-devtools-mcp` | 29 | 5,593 | 193 |
| `@discourse/mcp` | 16 | 2,936 | 183 |
| `@playwright/mcp` | 24 | 4,007 | 167 |
| `@goreleaser/mcp` | 1 | 106 | 106 |

207 tools, 57,739 tokens. Weighted by tool count, the average tool costs 279 tokens. The range is 106 to 14,021 for a whole server, and 106 to 526 per tool.

### Two independent axes

A server can be expensive because it is large, because it is verbose, or both. These are different failures with different fixes, and a single score would hide both.

**`@playwright/mcp` is large but lean.** 24 tools covering navigation, form filling, screenshots, keyboard and mouse, and tabs, at 167 tokens each. You cannot do browser automation with four tools. This is a scope decision, and defensible.

**`@upstash/context7-mcp` is small but verbose.** Two tools carrying 526 tokens each — 3.1× playwright's per-tool cost, from a server that does one thing. Nothing about the capability requires that.

**`@antv/mcp-server-chart` is both.** 27 tools at 519 tokens each: playwright's surface area at Context7's per-tool cost. It is the most expensive server measured, by a factor of 1.6 over the next one, and it is not a server anyone cites as expensive.

The two rankings genuinely diverge. Sorted by total cost, `chrome-devtools-mcp` (5,593) beats `next-devtools-mcp` (1,317) by 4×. Sorted per tool, next-devtools is 70% more expensive. Neither ordering is wrong; they answer different questions.

This is why there is deliberately **no single score** here.

---

## Methodology

Fundamentally, the numbers are the core deliverable.

**Metric** — For each tool returned by `tools/list`, the token count of `JSON.stringify` applied to the complete tool object exactly as the server returned it, including `title`, `outputSchema`, `annotations`, and any other fields present. This includes fields you might not expect: the captured filesystem server carries a `$schema` key inside each tool's `inputSchema`, and that is counted too.

Error runs in both directions. Hosts add per-request framing around the tool list that is not counted here, which makes real cost higher than reported. But not every captured field necessarily reaches the model — `icons` is display metadata and `_meta` is transport-level — so some of what is counted may never be sent, which makes real cost lower. Neither has been quantified yet.

Counting the whole object is deliberate. Anyone can recompute these numbers from the committed fixtures. A filtered count would require defending a per-field judgment about what hosts forward, which is not currently documented anywhere authoritative.

**Server totals are measured in one pass over the full tool array, not summed from the per-tool figures.** Array brackets and the commas between objects tokenize differently when adjacent to neighbouring content than when each tool is tokenized alone, so the two differ slightly. On `filesystem.json`: 2,795 single-pass, 2,793 summed. The single-pass figure is what a host actually sends. Both are asserted in the test suite, and the assertion that they *disagree* is what stops a future refactor from silently changing the published numbers.

**Tokenizer** — `gpt-tokenizer` with the `o200k_base` encoding, imported by explicit subpath so the encoding is visible at the import line. This is OpenAI's tokenizer, **not Anthropic's.** The figures are approximations and are labelled as such everywhere they appear. Anthropic's `count_tokens` endpoint will be used to publish an error margin.

**Data sources** — Captured from live servers and committed verbatim to `packages/analyzer/fixtures/real/`. Nothing is generated at request time. The raw JSON is in the repository, so any number here can be recomputed independently.

One server was captured twice, by hand and through the registry pipeline. The two files are byte-identical.

---

## Limitations of the overlap rule

`tool-overlap` compares tool names using Sørensen–Dice similarity over character trigrams, flagging pairs above 0.6. Across the twelve servers it produces well over a hundred findings, and most of them are wrong.

It does find real duplicates:

| Pair | Server | Score |
|---|---|---:|
| `firecrawl_monitor_check` / `firecrawl_monitor_checks` | firecrawl | 0.977 |
| `browser_network_request` / `browser_network_requests` | playwright | 0.977 |
| `get_console_message` / `list_console_messages` | chrome-devtools | 0.833 |
| `read_file` / `read_text_file` | filesystem | 0.632 |

And it fires just as confidently on pairs that are unrelated or actively opposite:

| Pair | Server | Score | What they actually are |
|---|---|---:|---|
| `browser_navigate_back` / `browser_navigate` | playwright | 0.848 | different operations |
| `performance_start_trace` / `performance_stop_trace` | chrome-devtools | 0.780 | a complementary pair |
| `connect` / `disconnect` | mongodb | 0.769 | opposites |
| `browser_click` / `browser_close` | playwright | 0.727 | unrelated |
| `browser_tabs` / `browser_type` | playwright | 0.700 | unrelated |
| `create-collection` / `drop-collection` | mongodb | 0.643 | opposites |
| `create_directory` / `list_directory` | filesystem | 0.615 | opposites |

`connect`/`disconnect` scores higher than `read_file`/`read_text_file`. `browser_click`/`browser_close` scores higher than any correct finding on the filesystem server. No threshold separates these, because the metric measures shared characters rather than shared purpose, and a prefix or suffix that two tools have in common is worth more to it than the word that distinguishes them.

### The failure gets worse as naming gets more consistent

`@antv/mcp-server-chart` names every tool `generate_*_chart`. That shared boilerplate alone clears 0.6, so the rule produces **52 findings from 27 tools** — including `generate_pie_chart` / `generate_venn_chart` (0.667) and `generate_bar_chart` / `generate_radar_chart` (0.765, the highest score on the server).

Real redundancy exists on that server: 27 tools that all draw a chart, where one tool with a `type` parameter would do. The rule fires 52 times and identifies essentially none of it. What it detected was a naming convention.

### And it misses cases it should catch

`list_directory` and `directory_tree` are the same operation and score 0.583 — below threshold. They share the nine characters of `directory`, exactly as `create_directory` and `list_directory` do, but positioned differently within each name. One fires, one doesn't, and the wrong one fires.

All four filesystem cases above are pinned as assertions, including the false positive and the miss, so a future change to the metric or threshold has to confront them rather than quietly move past.

Comparing descriptions or embeddings instead of names would address this. That is a v2 change, not a tuning change.

---

## A rule cut on evidence, and reinstated on better evidence

`deep-nesting` flags tool schemas nested more than three levels deep, on the theory that deeply nested arguments are harder for a model to construct correctly. It was specified, then cut, then brought back. All three steps are recorded here because the sequence is the point.

Depth excludes array `items` hops, so an array of objects counts as one level rather than two — `{ files: [{ path }] }` nests twice, not three times.

### Cut, on three servers

Before implementing it, depth was measured across the first three captured servers:

| Depth | Tools |
|---:|---:|
| 0 (no parameters) | 3 |
| 1 | 32 |
| 2 | 2 |
| 3+ | 0 |

37 tools, nothing above depth 2. There was no distribution to place a threshold in, so the rule was cut rather than shipped inert on every server indexed.

### Reinstated, on twelve

Nine more servers were captured afterwards. Across all 207 tools:

| Depth | Tools | Share |
|---:|---:|---:|
| 0 (no parameters) | 9 | 4.3% |
| 1 | 161 | 77.8% |
| 2 | 23 | 11.1% |
| 3 | 5 | 2.4% |
| 4 | 5 | 2.4% |
| 5 | 4 | 1.9% |

The original measurement was accurate; the sample was not representative. Three servers that happened to expose flat argument lists were treated as evidence about MCP schemas in general. They were evidence about three servers.

### The threshold, chosen from the distribution

Depth 3 is ordinary. The five tools there look like this:

```
data.nodes.items.name
screenshotOptions.viewport.width
queries.items.ohlc.open
style.palette.positiveColor
```

An array of objects with a name; a nested options group. Flagging these would be noise.

Depth 5 is a different shape:

```
data.children.items.children.items.children.items.name
```

That is a recursive tree — nodes with children that have children — written out three times because JSON Schema cannot express recursion without `$ref`. The author is working around a limitation rather than being careless, but the model still has to construct it, which is what the rule measures.

Firing above 3 flags **9 of 207 tools (4.3%)** and leaves the 193 tools at depth 2 or below alone. The boundary falls where the shapes stop looking ordinary.

The threshold was guessed at 3 before any of this was measured, and the guess turned out to be right. The reasoning that led to cutting the rule was wrong. Those are separate facts, and only the second one was a mistake.

### What it finds

All 14 depth-3+ tools come from three servers; the other nine produce nothing.

| Depth | Server | Tools |
|---:|---|---|
| 5 | antv-chart | `generate_fishbone_diagram`, `generate_mind_map`, `generate_organization_chart` |
| 5 | questdb | `apply_notebook_state` |
| 4 | antv-chart | `generate_district_map`, `generate_treemap_chart` |
| 4 | firecrawl | `firecrawl_search`, `firecrawl_crawl`, `firecrawl_interact` |

The nine depth-4+ findings collapse to about four underlying causes. Three firecrawl tools report the identical path `scrapeOptions.screenshotOptions.viewport.width`, because the same options blob is inlined into each; three antv tools report the identical recursive-children path. One schema decision surfaces as several findings, and the rule reports each tool that carries it rather than trying to attribute a shared cause.

---

## Why `large-enum` was kept

`large-enum` fires above 20 values. Across all twelve servers and 207 tools it has produced **zero findings**. The largest enum observed anywhere is 5 values (`browser_fill_form.fields[].type`, playwright).

So this threshold remains untested against real data, and the sample is now four times larger than the one that produced it without a single case approaching the line.

It is kept rather than cut because the distributions differ in kind. Enum size plausibly has a tail: a server exposing currencies, timezones, locales, or model names would carry dozens of values in one enum. None has been captured yet. Schema depth was cut on the belief that it had no tail, and a larger sample found one — which is a reason to hold this threshold loosely rather than cut it on the same grounds.

The zero result is pinned as an assertion, so the first server that trips it shows up as a deliberate change rather than passing unnoticed.

### What `missing-description` found instead

The rule with the most real-world signal turned out to be the simplest one. Undocumented parameters are close to universal:

- **filesystem**: 18 findings across 14 tools. Every tool has a description; almost no parameter does.
- **mongodb**: every `connectionId`, `database`, and `collection` parameter across 27 tools, undescribed.
- **firecrawl**: `firecrawl_scrape` alone has 44 undescribed parameters and nested properties.
- **questdb**: every `buffer_id` and `cell_id` across the notebook tools.

These are first-party servers from established vendors. The pattern is that authors document the tool surface and skip the schema.

---

## The registry

Servers are discovered through the official MCP registry at `registry.modelcontextprotocol.io`, then captured only after being reviewed and added by hand to a committed approval file. Discovery and execution are separate commands on purpose: nothing runs `npx` against a package that has not been vetted by name.

A full traversal on the date of writing: **25,845 servers**, of which **7,826** are distributed as npm packages over stdio, and **5,340** of those declare no required arguments or environment variables. The 7,826 package entries resolve to 7,581 distinct npm identifiers, so about 3% are listed more than once.

### Publisher concentration

The 7,826 npm+stdio entries come from 5,431 distinct publishers — an average of
1.44 each, so most people publish one server. The concentration sits in a thin
tail: the fifteen largest publishers account for 841 entries, about 11% of the
catalog, led by 127, 125, and 95 servers from three accounts.

Registry size is therefore a reasonable proxy for how many people are building
MCP servers, but a poorer one for how many distinct capabilities exist, since a
single publisher's hundred entries are unlikely to be a hundred unrelated tools.

### The reference implementations are not in it

No `@modelcontextprotocol/*` package appears in the catalog, including `server-filesystem`, which is measured in this project and was captured directly from npm instead. Searching the registry for "filesystem" returns third-party forks and unrelated servers.

### "No required configuration" is a claim, not a fact

Of the first thirteen packages captured through the pipeline, three failed. All three were listed as active, and two declared no required environment variables:

| Package | Registry says | Reality |
|---|---|---|
| `@perplexity-ai/mcp-server` | no required env | `PERPLEXITY_API_KEY environment variable is required` |
| `@bytebase/dbhub` | no required env | `Database connection configuration is required` |
| `@railway/mcp-server` | active npm package | deprecated; moved into the Railway CLI |

The first two are metadata that was wrong when published. The third is metadata that went stale. Both are ways a registry entry stops describing reality, and only one can be fixed by the publisher filling in a field.

Coverage here is therefore bounded three times: by what the registry lists, by what runs without credentials, and by whether the registry's own metadata is accurate about which is which.

---

## An open prediction

Recorded before measuring, so it can be wrong.

A widely-cited figure puts GitHub's official MCP server at 17,600 tokens of tool definitions per request. It comes from a vendor selling a tool-search product that reduces exactly this cost, so it deserves independent checking.

The prediction was first recorded against three servers, where 40 tools cost 7,854 tokens — 196 per tool — implying **roughly 90 tools**.

That basis has since moved. Across twelve servers, 207 tools cost 57,739 tokens, or 279 per tool, which implies **roughly 63 tools**. The original estimate is left above rather than overwritten.

The wider point is that the prediction is weaker than it looked. `@antv/mcp-server-chart` reaches 14,021 tokens from 27 tools. A server with 34 verbose tools would hit 17,600 just as easily as one with 90 lean ones, so the figure alone does not distinguish scope from bloat. What will distinguish them is GitHub's tool count, which is the thing to check.

The capture and the outcome will be added here unedited.

---

## Similar tools

Existing solutions to a similar problem:

- **[mcp-checkup](https://github.com/yifanyifan897645/mcp-checkup)** — grades the servers in your local config, detects duplicates, emits an optimization report.
- **[lean-ctx](https://github.com/yvgude/lean-ctx)** — intercepts the context your agent is trying to read and compresses on the fly.

`mcp-checkup` is **post-install** analysis: you point it at a server you have already decided to use. `lean-ctx` is **runtime** mitigation: it reduces the cost while your agent is running.

This project is neither — it is **pre-install**, so you can see the cost before connecting anything. No installation, no local config, no CLI. You look a server up the way you look up a package on Bundlephobia, before committing to it.

---

## Status

Twelve servers measured, analyzer complete (4 rules, 105 tests), registry ingest pipeline working, static site up and running.

- [x] Capture pipeline
- [x] Token counting validated against real fixtures
- [x] Analyzer rules
- [x] Registry discovery and vetted capture
- [x] Static site
- [ ] Anthropic tokenizer error margin
- [ ] GitHub capture

---

## Development

```bash
npm install

# Capture one server by hand
npx tsx scripts/capture.ts <name> <command> [args...]
npx tsx scripts/capture.ts playwright npx -y @playwright/mcp@latest

# Registry pipeline: discover, then capture only what you approved
npm run ingest:discover          # writes data/registry-candidates.json for review
# edit scripts/ingest-approved.json by hand
npm run ingest:capture           # expect failures; each is logged, the batch continues

npx tsx scripts/count.ts         # token counts for a captured fixture
npm test
```

The repo is ESM (`"type": "module"` at the root). Config files must use `export default` or be named `.cjs`.

`packages/analyzer` is pure TypeScript with no I/O — it is bundled into the browser. Anything touching the filesystem or network belongs in `scripts/`.

---

## License

MIT.
