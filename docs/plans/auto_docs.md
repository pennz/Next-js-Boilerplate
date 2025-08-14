I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim:

---
## Comment 2: docs-validation workflow creates link-check config after running link check, rendering config unused.

Reorder steps in `.github/workflows/docs-validation.yml` so that `Create link check config` occurs before `Check markdown links`. Ensure `markdown-link-check` references `.github/markdown-link-check-config.json`.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/.github/workflows/docs-validation.yml
---
## Comment 3: docs-maintenance workflow references non-existent .markdown-link-check.json, causing false failures.

Update `.github/workflows/docs-maintenance.yml` to use `--config .github/markdown-link-check-config.json`, or add a root `.markdown-link-check.json` with the same contents. Prefer reusing the `.github` config for consistency.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/.github/workflows/docs-maintenance.yml
- /Users/v/works/Next-js-Boilerplate/.github/workflows/docs-validation.yml
---
## Comment 4: docs:validate exits with code 2 on warnings, breaking docs:health and CI gating unexpectedly.

Change the validation step in `.github/workflows/docs-maintenance.yml` to `npm run docs:validate -- --exit-on-error --save-report`. Update the `docs:health` script in `package.json` to run validation in non-blocking mode (e.g., `"docs:health": "npm run docs:validate || true && npm run docs:generate --silent"`).

### Referred Files
- /Users/v/works/Next-js-Boilerplate/package.json
- /Users/v/works/Next-js-Boilerplate/.github/workflows/docs-maintenance.yml
- /Users/v/works/Next-js-Boilerplate/scripts/docs/validate-docs.ts
---
## Comment 5: Test docs updater fails when testing-quality-assurance-requirements.md does not exist initially.

Modify `scripts/docs/generate-test-docs.ts` to create `docs/testing-quality-assurance-requirements.md` if it does not exist. Add a baseline skeleton including headers: `## Updates`, `## Test Metrics and Coverage`, and `## Test Inventory` before performing section updates.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-test-docs.ts
---
## Comment 6: OpenAPISpec interface omits security property while code references spec.security during generation.

In `scripts/docs/generate-api-docs.ts`, update `interface OpenAPISpec` to include `security?: Array<Record<string, any>>;`. Re-run type checks with `npm run check:types`.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-api-docs.ts
---
## Comment 7: Generation pipeline does not invoke api:generate before API docs, risking stale OpenAPI docs.

Update `package.json` so that `docs:generate` runs `api:generate` before `docs:generate:api` (e.g., `"docs:generate": "run-s api:generate docs:generate:api docs:generate:components docs:generate:db docs:generate:tests docs:update-traceability"`). Also update the API docs job in `.github/workflows/docs-maintenance.yml` to run `npm run api:generate` before `docs:generate:api`.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/package.json
- /Users/v/works/Next-js-Boilerplate/.github/workflows/docs-maintenance.yml
---
## Comment 8: CI attempts to push commits from workflow to PR branches, which fails for forks.

In `.github/workflows/docs-maintenance.yml`, replace direct `git push` steps with `peter-evans/create-pull-request@v6`, or add a conditional to skip commits when `github.event.pull_request.head.repo.fork` is true.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/.github/workflows/docs-maintenance.yml
---
## Comment 9: validate-docs includes unused imports and might be heavier than needed for current checks.

Remove the unused `JSDOM` import from `scripts/docs/validate-docs.ts`. Where possible, defer style rules to markdownlint rather than custom regex to reduce false positives.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/validate-docs.ts
---
## Comment 10: Component story args extraction is stubbed, reducing usefulness of generated usage documentation.

Enhance `extractStoryArgs` in `scripts/docs/generate-component-docs.ts` to parse story files for `args` objects (variable declarations with exported `const` assigned object literals). Populate props usage in the generated docs.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-component-docs.ts
---
## Comment 11: Database docs generation assumes `src/models/Schema.ts` exists; add graceful fallback or configuration.

In `scripts/docs/generate-db-docs.ts`, check for the presence of `src/models/Schema.ts` (or configurable path via env `DB_SCHEMA_PATH`). If missing, warn and skip rather than throwing. Optionally add a README note about index extraction limitations.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-db-docs.ts
---
## Comment 12: API doc generator metadata omits lastModified per source file, reducing freshness visibility.

Update `generateMetadata` in `scripts/docs/generate-api-docs.ts` to compute `lastModified` for OpenAPI and validation files via `fs.stat` and include it in generated header.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/scripts/docs/generate-api-docs.ts
---

