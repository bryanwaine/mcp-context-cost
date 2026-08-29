# mcp-context-cost

## What this is

A static site that reports the context-window cost of published MCP servers, so a
developer can check the cost **before** connecting the server. Think Bundlephobia,
but for MCP servers instead of npm packages.

Everything is precomputed offline and committed to the repo. The deployed site is
static files. There is no server at request time.

## Non-goals — do not build these

- No database of any kind.
- No user accounts, no auth, no sessions.
- No connecting to an MCP server at request time. Ingestion happens offline only.
- No LLM API calls anywhere in the codebase.
- No composite "grade" or score out of 100. Report raw numbers only.
- No executing arbitrary `npx` packages from the registry on the dev machine.

If a task seems to require one of the above, stop and ask instead of building it.

## Stack

- TypeScript, `strict: true`. No `any`, no `@ts-ignore`.
- npm workspaces.
- Vitest for tests.
- Next.js App Router with static export for the site. Tailwind for styling.
- `gpt-tokenizer` for token counting (pure JS, runs in both Node and the browser).
- `@modelcontextprotocol/sdk` for the offline ingest script only.

## Repo layout

```
packages/analyzer/     Pure TypeScript. No I/O. Runs in the browser.
  src/rules/           One file per rule.
  src/index.ts         analyze(tools: ToolDef[]): Report
  fixtures/synthetic   Hand-written. One file per rule: the pathology plus a clean control. Used by rule unit tests.
  fixtures/real        Captured from live servers by scripts/capture.ts. Snapshot tests and site content only. Never rule unit tests.
scripts/ingest.ts      Run manually. Connects to servers, writes data/servers/*.json
data/servers/          Committed JSON. Generated, but checked in on purpose.
apps/web/              Next.js. Reads data/servers/ at build time.
```

## Hard rules

1. `packages/analyzer` must never import `fs`, `node:*`, or make a network call.
   It is bundled into the browser. Anything needing I/O belongs in `scripts/` or
   in a Next.js build-time function.
2. Every rule is a pure function `(ctx: RuleContext) => Finding[]`, exported from
   its own file in `src/rules/`, and registered in one array in
   `src/rules/index.ts`. Adding a rule must not require editing anything else.

   ```ts
   interface RuleContext {
     tools: readonly ToolDef[];               // exactly as returned by tools/list
     measurements: Measurements;              // output of the measurement pass
     countTokens: (value: unknown) => number; // injected; rules never import a tokenizer
   }
   ```

   Rules destructure what they need. `ToolDef` is never extended with derived
   data — it stays exactly the shape the server returned (see rule 5).
3. Write the test first for every analyzer rule, using `fixtures/synthetic/` only. Do not write the
   implementation until the test exists and fails. Each synthetic
   fixture pairs the pathology with a clean control so the test asserts both a
   positive and a negative case. Do not write the implementation until the test
   exists and fails.
4. Never invent a method name on `@modelcontextprotocol/sdk`, and never invent a
   registry API endpoint or response shape. Read the type definitions in
   `node_modules/@modelcontextprotocol/sdk`, or ask me to paste the relevant docs.
   A guessed endpoint that returns 404 at 2am is the main way this project fails.
5. Keep `data/servers/*.json` exactly as returned by the server. Do not reformat,
   sort, or strip fields during ingest. Normalisation happens in the analyzer.
6. The repo is ESM (`"type": "module"` at root). All config files must use
   `export default`, or be named `.cjs`. Never write `module.exports` in a `.js` file.

## Domain notes

A tool definition as returned by `tools/list` looks like:

```json
{
  "name": "create_issue",
  "description": "Create a new issue in a repository",
  "inputSchema": { "type": "object", "properties": { ... }, "required": [ ... ] }
}
```

Token cost for one tool is the token count of `JSON.stringify` of the **entire
tool object exactly as returned by `tools/list`**, including `title`,
`outputSchema`, `annotations`, `execution`, `icons`, and `_meta` when present.
`ToolDef` mirrors the SDK's `Tool` shape structurally.

Two approximations, both acceptable for v1, both of which must surface in the UI:

1. Hosts may not forward every field to the model. `icons` is display metadata
   and `_meta` is transport-level, so real model-facing cost is plausibly lower
   than reported. Counting everything the server returned is chosen because it is
   reproducible from the committed fixture; excluding fields would require
   defending a judgment call per field.
2. `gpt-tokenizer` uses OpenAI's `o200k_base` encoding, which is not Anthropic's
   tokenizer.

```ts
export const TOKENIZER: TokenizerInfo = { id: "o200k_base", approximate: true };
```

The UI composes the caveat sentence from this object. Never present these numbers
as exact.

## Measurement pass

Always runs, always reports, never produces findings. Output lands on `Report`:

- tokens per tool
- server total
- tokens per tool, averaged
- context window size in tokens (200,000), stored raw so the UI can compute the
  percentage. The analyzer never stores a percentage: window size varies by model
  and is not a property of the server being measured.

These are facts about the server, not problems with it. A server can be
expensive and well-authored at the same time. Reporting cost as a "finding"
would imply otherwise.

`serverTotalTokens` is measured in one pass over the full tools array. Never sum
it from `perTool`. Joining boundaries (array brackets, commas between objects)
tokenize differently when adjacent to neighbouring content than when each tool is
tokenized in isolation, so the two differ. Measured on `filesystem.json`: 2,795
single-pass, 2,793 summed. The single-pass figure is what a host actually sends.

## Rules

Fire only on problems. Each returns findings or an empty array.

| id                          | flags |
|-----------------------------|-------|
| `missing-description`       | Tool or parameter has no description. |
| `description-restates-name` | Description adds nothing beyond the name. |
| `large-enum`               | An enum with more than 20 values. |
| `deep-nesting`             | Schema object nesting deeper than 3 levels. |
| `tool-overlap`             | Two tools in the same server with trigram similarity > 0.6. |

Stop at these five. Do not add more without asking.

## Commands

```
npm test            Vitest, watch mode off
npm run ingest      Manual ingest. Writes data/servers/. Expect failures; log and continue.
npm run dev         Next.js dev server
npm run build       Static export to apps/web/out
```

## Definition of done

- `npm test` passes with a test per rule.
- `npm run build` produces a static export with no runtime data fetching.
- Every server page states the tokenizer caveat.
- README leads with a real measured number from a real server.
