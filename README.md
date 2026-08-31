# mcp-context-cost

Every MCP server you connect spends part of your context window before the agent does any work. The tool definitions have to be sent to the model on every single request, whether or not a tool is ever called.

This project measures that cost for published servers, so you can check it **before** you connect one.

---

## The measurement

Three servers, captured directly from their `tools/list` response:

| Server | Tools | Total tokens | Tokens per tool |
|---|---:|---:|---:|
| `@playwright/mcp` | 24 | 4,007 | 167 |
| `@modelcontextprotocol/server-filesystem` | 14 | 2,795 | 200 |
| `@upstash/context7-mcp` | 2 | 1,052 | **525** |

Connect all three and you have spent 7,854 tokens — about 3.93% of a 200k context window — before the model reads a single line of your actual problem.

### The two rankings invert

Ranked by total cost: playwright, filesystem, context7.

Ranked by cost per tool: context7, filesystem, playwright.

That inversion is the whole point of this project. The two rankings measure different failures, and conflating them into one score hides both.

**Playwright is expensive because it is large.** 24 tools covering navigation, form filling, screenshots, keyboard and mouse, and tab management, each written tightly at 167 tokens. You cannot do browser automation with four tools. This is a scope decision, and defensible.

**Context7 is expensive because it is verbose.** Two tools carrying 525 tokens each — 3.1× playwright's per-tool cost. Nothing about the capability requires that. This is an authoring problem, and it is fixable without removing a single feature.

The advice differs completely. To a Context7 user: this server wastes your context, open an issue. To a playwright user: this server is fine, but connect it alongside three others and budget accordingly.

This is also why there is deliberately **no single score** here. Any composite metric has to weight these two axes arbitrarily, and most weightings would rank Context7, the worst-authored server measured so far, as the cheapest.

### Independent reproduction

The `mcp-checkup` project reported that Context7's tool descriptions cost roughly three times more tokens than necessary. This project measured 3.1× playwright's per-tool cost, using a different tokenizer, on a different day, without having read their methodology first.

Two independent measurements landing on the same multiple is worth more than either one alone.

---

## Methodology

Fundamentally, the numbers are the core deliverable.

**Metric** **-** For each tool returned by `tools/list`, the token count of
`JSON.stringify` applied to the complete tool object exactly as the server returned it — including `title`, `outputSchema`, `annotations`, and any other fields present. This includes fields you might not expect: the captured filesystem server, for instance, carries a `$schema` key inside each tool's `inputSchema`, and that is counted too.

Error runs in both directions. Hosts add per-request framing around the tool list that is not counted here, which makes real cost higher than reported. But not every captured field necessarily reaches the model — `icons` is display metadata and `_meta` is transport-level — so some of what is counted may never be sent, which makes real cost lower. Neither has been quantified yet.

Counting the whole object is deliberate. Anyone can recompute these numbers from the committed fixtures. A filtered count would require defending a per-field judgment about what hosts forward, which is not currently documented anywhere authoritative.

**Tokenizer** **-** `gpt-tokenizer` with the `o200k_base` encoding. This is OpenAI's tokenizer, **not Anthropic's.** The figures are approximations and are labelled as such everywhere they appear. Anthropic's `count_tokens` endpoint will be used to publish an error margin.

**Data sources** **-** Captured from live servers via `scripts/capture.ts` and committed verbatim to `packages/analyzer/fixtures/real/`. Nothing is generated at request time. The raw JSON is in the repository, so any number here can be recomputed independently.

**Coverage** **-** Comprehensive coverage is fundamentally unattainable. Servers requiring authentication, or distributed only as containers, are harder to capture. The site reports how many servers have been measured, but never implies it covers the ecosystem.

---

## Limitations of the overlap rule

`tool-overlap` compares tool names using Sørensen–Dice similarity over character trigrams, flagging pairs above 0.6. Run against the filesystem server, it produces two correct findings, one false positive, and one miss:

| Pair | Score | Verdict |
|---|---:|---|
| `list_directory` / `list_directory_with_sizes` | 0.686 | correct |
| `read_file` / `read_text_file` | 0.632 | correct |
| `create_directory` / `list_directory` | 0.615 | **false positive** |
| `list_directory` / `directory_tree` | 0.583 | **miss** |

The false positive scores higher than the miss. That is not a threshold that needs tuning — no value separates these four correctly, because the metric measures shared characters rather than shared purpose. `create_directory` and `list_directory` are opposite operations that share nine characters of suffix; `list_directory` and `directory_tree` are the same operation, and share the same nine characters, but positioned differently within each name. Trigram similarity cannot tell those cases apart.

The rule also detects less than it might appear to. The filesystem server has four tools that all read a file, but only one of those six pairs clears the threshold — `read_media_file` and `read_multiple_files` carry enough unshared trigrams to fall below it.

All four cases above are pinned as assertions, including the false positive and the miss, so a future change to the metric or threshold has to confront them rather than quietly move past.

Comparing descriptions or embeddings instead of names would address this. That is a v2 change, not a tuning change.

---

## A rule that was specified, measured, and cut

`deep-nesting` was in the original rule set: flag tool schemas nested more
than three levels deep, on the theory that deeply nested arguments are harder
for a model to construct correctly.

Before implementing it, the depth of every tool across all three captured
servers was measured. Items hops are excluded, so an array of objects counts
as one level rather than two:

| Depth | Tools |
|---:|---:|
| 0 (no parameters) | 3 |
| 1 | 32 |
| 2 | 2 |
| 3+ | 0 |

37 tools. The deepest schemas in the set are `browser_fill_form`
(`fields.items.element`) and `edit_file` (`edits.items.oldText`), both at
depth 2. Nothing reaches 3.

MCP tool schemas, at least in these three servers, are essentially flat: an
object of scalars, occasionally an array of small objects. There is no
distribution here to draw a threshold through, so any value would have been
arbitrary and the rule would have reported zero findings on every server
indexed.

It was cut rather than shipped inert. If a future capture shows deeper
schemas, the measurement is here to revisit.

The remaining three rules are `missing-description`, `large-enum`, and
`tool-overlap`.

---

## Why `large-enum` was kept

`large-enum` fires above 20 values. The largest enum across the three captured
servers is 5 (`browser_fill_form.fields.items.type`); seven of the eight enums
found sit between 2 and 5, and one server has none at all. So this threshold is
untested against real data and provisional, in exactly the way
`deep-nesting`'s was.

It was kept because the two distributions differ in kind. Schema depth showed no
tail at all — 34 of 37 tools at depth 0 or 1, nothing above 2 — and there is no
reason to expect deeper ones, since MCP arguments are function parameters and
functions rarely take deeply nested structures. Enum size plausibly does have a
tail: a server exposing currencies, timezones, locales, or model names would
carry dozens of values in a single enum. None has been captured yet.

The rule reports zero findings on every server currently indexed. That is pinned
as an assertion, so the first server that trips it shows up as a deliberate
change rather than passing unnoticed.

---

## A second rule cut

`description-restates-name` was specified but never built. Trigram similarity
between each tool's name and the first sentence of its description was measured
across all three servers first:

| Tool | Description opens | Score |
|---|---|---:|
| `browser_console_messages` | "Returns all console messages" | 0.625 |
| `browser_resize` | "Resize the browser window" | 0.571 |
| `create_directory` | "Create a new directory or ensure a directory exists..." | 0.491 |
| `browser_close` | "Close the page" | 0.261 |
| `browser_find` | "Search the accessibility snapshot..." | 0.000 |

`browser_close` is a total restatement and scores below `create_directory`,
whose description explains idempotency, nested creation, and silent success.
`browser_find` scores zero against an informative paragraph — the right verdict
for the wrong reason.

The metric tracks description *length*, not informational overlap. Short
descriptions score high whether or not they restate; long ones score low
whether or not they do. The distribution is a smooth gradient from 0.000 to
0.625 with correct classifications scattered across all of it, so no threshold
separates them.

Detecting this properly needs semantic comparison, not character overlap. That
is a different project.

---

## An open prediction

Recorded before measuring, so it can be wrong.

A widely-cited figure puts GitHub's official MCP server at 17,600 tokens of tool definitions per request. It comes from a vendor selling a tool-search product that reduces exactly this cost, so it deserves independent checking.

Across the three servers here, 40 tools cost 7,854 tokens, or 196 per tool weighted by tool count. At that rate, 17,600 tokens implies roughly **90 tools**.

If that holds, GitHub is a *scope* story, not a *bloat* story. The loudest
number in the ecosystem would turn out to be evidence of surface area rather than waste, and the framing above predicted it.

If GitHub instead comes in at a high per-tool cost, that is a genuinely bloated server at scale, which is a more interesting finding.

Either result is worth more than a number measured after the answer was known. The capture and the outcome will be added here unedited.

---

## Similar tools

Existing solutions to a similar problem:

- **[mcp-checkup](https://github.com/yifanyifan897645/mcp-checkup)** — grades the servers in your local config, detects duplicates, emits an optimization report.

- **[lean-ctx](https://github.com/yvgude/lean-ctx)** - intercepts the context your agent is trying to read and compresses on the fly

`mcp-checkup` is **post-install** analysis: you point it at a server you have already decided to use. `lean-ctx` is **runtime** mitigation: it reduces the cost while your agent is running.

 This project is neither — it is **pre-install**, so you can see the cost before connecting anything.
 No installation, no local config, no CLI. You look a server up the way you look up a package on Bundlephobia, before committing
to it.

---

## Status

Three servers measured, analyzer complete (3 rules, 51 tests).

- [x] Capture pipeline (`scripts/capture.ts`)
- [x] Token counting validated against real fixtures
- [x] Analyzer rules
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

`packages/analyzer` is pure TypeScript with no I/O — it is bundled into the browser. Anything touching the filesystem or network belongs in `scripts/`.

---

## License
MIT.