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
- `packages/analyzer` compiles to `dist/` via `tsc` and is consumed as an ordinary
built package. It is not transpiled from source by the web app.
- `@modelcontextprotocol/sdk` for the offline ingest script only.

## Repo layout

```
packages/analyzer/     Pure TypeScript. No I/O. Runs in the browser.
  src/rules/           One file per rule.
  src/index.ts         analyze(tools: ToolDef[]): Report
  dist/                Build output, gitignored. `main` and `types` point here.
  fixtures/synthetic   Hand-written. One file per rule: the pathology plus a clean control. Used by rule unit tests.
  fixtures/real        Captured from live servers by scripts/capture.ts or scripts/ingest-capture.ts. Committed. Snapshot tests and site content only. Never rule unit tests.
scripts/capture.ts           Run manually. Captures one named server by command line.
scripts/ingest-discover.ts   Run manually. Queries the MCP registry, writes data/registry-candidates.json (gitignored, regenerated each run).
scripts/ingest-approved.json Committed. Hand-edited list of registry candidates approved for capture — the only way scripts/ingest-capture.ts is allowed to run npx against a package.
scripts/ingest-capture.ts    Run manually. Captures only servers listed in scripts/ingest-approved.json, writes packages/analyzer/fixtures/real/*.json
apps/web/                    Next.js, static export. Will read packages/analyzer/fixtures/real/ at build time.
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

   `countTokens` is injected rather than imported by rules so that rule unit
   tests can pass a stub — `countTokens: () => 340` — and assert the rule's
   logic without running a real tokenizer. With a direct import, every rule test
   would depend on gpt-tokenizer's actual output, and a failing test could not
   tell you whether the rule or the tokenizer was wrong. Rules must never import
   from `tokenize.ts` directly.
3. Write the test first for every analyzer rule, using `fixtures/synthetic/` only.
   Do not write the implementation until the test exists and fails. Each synthetic
   fixture pairs the pathology with a clean control so the test asserts both a
   positive and a negative case.

   Real captures in `fixtures/real/` are used for measurement tests and for
   separate `*.real.test.ts` files that pin a rule's behaviour against live data.
   They are never used for rule unit tests: a real server may contain none of the
   pathology a rule looks for, and a rule tested only against it can pass
   vacuously.

   Numbers pinned in a `*.real.test.ts` must come from running the rule and
   reading the output, never from the README or from a previous plan. Quote the
   run in a comment above the assertions.
4. Never invent a method name on `@modelcontextprotocol/sdk`, and never invent a
   registry API endpoint or response shape. Read the type definitions in
   `node_modules/@modelcontextprotocol/sdk`, or ask me to paste the relevant docs.
   A guessed endpoint that returns 404 at 2am is the main way this project fails.
5. Keep `packages/analyzer/fixtures/real/*.json` exactly as returned by the
   server. Do not reformat, sort, or strip fields during capture. Normalisation
   happens in the analyzer.
6. The repo is ESM (`"type": "module"` at root). All config files must use
   `export default`, or be named `.cjs`. Never write `module.exports` in a `.js` file.
7. Never merge `process.env` into a spawned third-party process. Pass only
   explicitly supplied variables and let the SDK apply its safe defaults.
   The parent environment may contain credentials.
8. Never create scratch, temporary, or `_`-prefixed files in the repo.
   Verification belongs in tests. If a check is worth running once, it is worth
   running on every `npm test`. Throwaway scripts go in the session scratchpad
   outside the repo.
9. `packages/analyzer` is consumed as a built package (`main: dist/index.js`),
   never as raw TypeScript. Do not add `transpilePackages`, bundler
   `extensionAlias` config, or `--webpack` flags to make source imports work.
   The analyzer's internal specifiers use the ESM `./foo.js` form; Turbopack
   will not resolve those against `.ts` files, and every workaround for that
   pins the project to a non-default bundler. Build the package instead.

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
| `large-enum`                | An enum with more than 20 values. |
| `tool-overlap`              | Two tools in the same server with trigram similarity > 0.6. |
| `deep-nesting`              | Schema nesting deeper than 3 levels (array `items` hops excluded). |

Stop at these four. Do not add more without asking.

Thresholds are provisional unless a distribution across the real fixtures
justifies them. `deep-nesting` was cut once for lack of a distribution and
reinstated when a larger sample produced one; `large-enum` has never fired on
real data and is kept on the expectation that enum size has a tail. See the
README for both arguments.

## Commands

```
npm test                Vitest, watch mode off
npm run ingest:discover Query the MCP registry. Writes data/registry-candidates.json for review.
npm run ingest:capture  Capture only servers approved in scripts/ingest-approved.json. Writes packages/analyzer/fixtures/real/. Expect failures; each is logged and the batch continues.
npm run dev             Next.js dev server
npm run build           Builds packages/analyzer to dist/, then static-exports apps/web to apps/web/out
```

## Definition of done

Analyzer (done):

- `npm test` passes, with a synthetic test per rule and a real-fixture test for
  every rule that fires on real data.
- `npx tsc --noEmit -p packages/analyzer/tsconfig.json` is clean.
- README leads with a real measured number from a real server.

Site (current):

- [x] `npm run build` produces a static export with no runtime data fetching.
- [x] Every server page states the tokenizer caveat.
- [ ] Index page and scatter plot.
