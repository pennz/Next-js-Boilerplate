I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim:

---
## Comment 1: Doc generation scripts import packages not listed in devDependencies causing runtime failures.

Update `package.json` devDependencies to include `glob`, `yaml`, `marked`, `chalk`, and `ts-morph`. Then run `npm i -D glob yaml marked chalk ts-morph` and commit changes.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/package.json
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-api-docs.ts
- /Users/v/works/Next-js-Boilerplate/scripts/docs/validate-docs.ts
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-db-docs.ts
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-test-docs.ts
---
## Comment 2: CLI entrypoint uses require.main in ESM/tsx context which can throw ReferenceError.

Replace `if (require.main === module)` guards with ESM-safe checks using `import.meta.url` across all scripts in `scripts/docs/**`. Example: `const isCli = import.meta.url === pathToFileURL(process.argv[1]).href; if (isCli) main();`

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-api-docs.ts
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-component-docs.ts
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-db-docs.ts
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-test-docs.ts
- /Users/v/works/Next-js-Boilerplate/scripts/docs/validate-docs.ts
---
## Comment 3: DB docs parser fails to walk Drizzle call chains, producing incorrect types/constraints.

In `scripts/docs/generate-db-docs.ts`, implement a robust call-chain traversal for column definitions to collect all method calls (e.g., `varchar` -> `notNull` -> `unique`). Use this to set `type`, `nullable`, `unique`, `primaryKey`, and numeric options. Add tests against sample Drizzle column definitions.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-db-docs.ts
---
## Comment 4: Validation workflow treats warnings as failures, blocking merges unnecessarily.

Update `.github/workflows/docs-maintenance.yml` to set separate outputs for `exit_code` and `has_errors` by parsing `docs/validation-report.json`, and change the blocking step to check `has_errors` only.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/.github/workflows/docs-maintenance.yml
- /Users/v/works/Next-js-Boilerplate/scripts/docs/validate-docs.ts
---
## Comment 5: Commit steps in workflows reference pull_request context without guarding event type.

In `.github/workflows/docs-maintenance.yml`, add `github.event_name == 'pull_request'` to each commit step's `if:` to avoid referencing `github.event.pull_request` on non-PR events.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/.github/workflows/docs-maintenance.yml
---
## Comment 6: Markdown linter config used in maintenance workflow may be missing, causing inconsistent results.

Either commit a `.markdownlint.json` at repo root or add a step in `.github/workflows/docs-maintenance.yml` to generate it before the lint step (copy from `docs-validation.yml`).

### Referred Files
- /Users/v/works/Next-js-Boilerplate/.github/workflows/docs-maintenance.yml
- /Users/v/works/Next-js-Boilerplate/.github/workflows/docs-validation.yml
---
## Comment 7: Pre-commit docs link check only matches top-level files, missing nested docs.

Update the `docs-validation` command in `lefthook.yml` to match nested Markdown files (e.g., use `[[ "$file" == docs/* ]] && [[ "$file" == *.md ]]`).

### Referred Files
- /Users/v/works/Next-js-Boilerplate/lefthook.yml
---
## Comment 8: Shell pipeline in docs link check uses if/while incorrectly; may mask failures.

Rewrite the `docs-validation` hook to collect link paths and verify existence in a for-loop, setting a `failed=1` flag if any are broken, and `exit $failed` at the end.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/lefthook.yml
---
## Comment 9: API docs generator hardcodes two OpenAPI files; consider globbing for scalability.

Modify `loadOpenAPISpecs()` in `scripts/docs/generate-api-docs.ts` to use `glob('openapi/*.{yml,yaml}')` and iterate over all specs instead of a fixed list.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-api-docs.ts
---
## Comment 10: Zod schema extraction via regex is fragile; misses many common patterns.

Refactor Zod parsing in `generate-api-docs.ts` to use TS AST (ts-morph) to find exported consts referencing Zod, or use `zod-to-openapi` metadata to pull validation rules.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-api-docs.ts
---
## Comment 11: Test parser only matches describe/it/test identifiers; misses .each/.concurrent/property calls.

Update `extractTestCases()` to detect `PropertyAccessExpression` with base identifier `describe|it|test` (e.g., `it.each`, `describe.concurrent`) and extract the first string literal arg.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-test-docs.ts
---
## Comment 12: Docs health script always runs docs:generate, which may be surprising and expensive.

Change the `docs:health` script to run only validation by default. Add `docs:health:fix` (or `--generate`) to run generation. Example: `"docs:health": "npm run docs:validate"` and `"docs:health:generate": "npm run docs:validate && npm run docs:generate --silent"`.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/package.json
---
## Comment 13: Docs-validation workflow’s “API documentation sync” step is a stub; add actual checks.

Enhance `openapi-validation` job to parse `openapi/*.yml|yaml` paths and ensure each appears in `docs/api-endpoints-documentation.md`. Use `node` to parse YAML and output a coverage summary; fail if coverage < threshold.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/.github/workflows/docs-validation.yml
---
## Comment 14: Docs generator doesn’t ensure docs directory exists in all paths.

Before writing to `docs/*.md` in `generate-db-docs.ts` and `generate-test-docs.ts`, ensure `docs` directory exists: `await fs.promises.mkdir(path.join(process.cwd(), 'docs'), { recursive: true })`.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-db-docs.ts
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-test-docs.ts
---

