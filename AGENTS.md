# Repository instructions

## Scope and priorities

This package injects Cloudflare Turnstile into HTML, forms, and browser requests through a Cloudflare Worker. Preserve request handling and browser behavior when updating dependencies, lint rules, or build tooling.

- Keep changes focused and simple. Remove obsolete configuration, dependencies, and generated leftovers from the change; avoid duplicate implementations.
- Prefer existing configuration and commands over new scripts, loaders, declaration shims, or test infrastructure.
- Use descriptive source names. Bundle size is the minifier's responsibility; do not manually rename local variables to single letters.
- Prettier formatting is welcome, including embedded README examples. Avoid unrelated refactors or moving declarations solely for cosmetic consistency.
- The current browser baseline is **ES2015 (ES6)**. This supersedes the former ES5 requirement. Do not change the baseline again as an incidental dependency or lint fix.

## Repository map

Library sources are under `libs/@cf-workers/turnstile-injection/src/`:

- `index.ts`: Worker entry point, routing, origin requests, and response headers.
- `turnstile-element-handlers.ts`: HTML rewriting and frontend script placeholder substitution.
- `turnstile-verification.ts`: request token parsing and Turnstile verification.
- `frontend/index.ts`: injected browser script and its browser interfaces.

`webpack.config.js` owns bundling and frontend minification. Library TypeScript settings live in `libs/@cf-workers/turnstile-injection/tsconfig.json`; `tsconfig.build.json` beside it adds emit settings. `tests-e2e/` is a separate Worker consumer with its own manifest and lockfile, resolving the built package from `dist/`.

## Toolchain and dependencies

- Use the Node version in `.nvmrc` and npm version in the root `package.json`. When installed, `node node_modules/npm/bin/npm-cli.js` runs the repository's pinned npm. Avoid machine-specific paths in repository files.
- **TypeScript 7 compiles shipped JavaScript, emits declarations, and runs type checks.** The `@typescript/native` dependency aliases the TypeScript 7 package and supplies `tsc`.
- The dependency named `typescript` supplies Microsoft's TypeScript 6 compatibility API for ESLint and development tools that still require it. It is intentional, not a second build compiler. Check `node_modules/.bin/tsc --version` if compiler resolution is uncertain.
- Keep manifests and lockfiles consistent. Confirm dependency changes with a clean `npm ci`; do not hide peer incompatibilities with `--force`, `--legacy-peer-deps`, or speculative overrides.
- Root installation does not refresh `tests-e2e/node_modules`. Install that project's locked dependencies when its checks require it.
- Use the stable `@cloudflare/workers-types` entry point. Workers types v5 removed dated entry points. A type package update does not by itself require changing Wrangler's runtime `compatibility_date`.
- Keep shared compiler settings inherited rather than duplicated. A child `compilerOptions.types` array replaces the parent's array, so test configurations needing Worker globals must retain `@cloudflare/workers-types`.

## Build invariants

- The native compiler emits JavaScript, declarations, and source maps once into `tmp/libs/@cf-workers/turnstile-injection/`. Webpack consumes that JavaScript and produces `index.js` (UMD/CommonJS) and `index.mjs` (ESM) in `dist/libs/@cf-workers/turnstile-injection/`.
- Preserve ES2015 syntax targets in TypeScript, webpack, and frontend Terser settings. Worker runtime APIs and browser runtime APIs have different availability; compiler `lib` declarations do not supply browser polyfills.
- Keep the frontend as an injected script. It is minified separately through `DefinePlugin.runtimeValue`, including in **development builds**, for both distributed formats. Outer webpack minification alone does not minify JavaScript embedded in a string.
- Keep local variable mangling enabled. Preserve external property names, callback hooks, and `VAR_*` placeholders used by HTML/script substitution.
- Terser's `compress.properties: false` preserves quoted placeholder keys until the configured field name is substituted. Field names may contain hyphens or dots; property rewriting or mangling must not break them.
- Keep the existing native compiler integration instead of restoring `ts-loader`, `dts-bundle-generator`, separate per-format compiler configs, or a redundant declaration build step.
- Do not reintroduce `scripts/minify-frontend-loader.mjs`, `src/frontend/raw.d.ts`, or raw-loader plumbing. Prefer a small change in the existing webpack configuration.
- Public declarations must resolve from the published package without missing private files. Preserve both package exports and source maps back to the original TypeScript.
- `dist/` and `tmp/` are generated output. Do not commit them, package tarballs, diagnostic fixtures, logs, or `node_modules/`.

### Watch mode

Compile initially and when library source or compiler configuration changes. Emitted JavaScript changes must invalidate webpack's modules and injected frontend script without triggering another TypeScript compilation indefinitely.

Keep source/context and compiler configuration dependencies registered. Do not ignore all of `tmp/` in webpack watchers: doing so can leave cached frontend output stale. Ignoring it in Git, lint, and formatting is appropriate.

Compiler errors must fail the compilation while leaving the watcher able to recover after the source is fixed. Preserve error reporting through `compilation.errors` in the current compilation hook. When changing this integration, verify frontend edits, edit restoration, and recovery from an initial TypeScript error without restarting the watcher.

## Browser behavior

- Preserve intentional `indexOf`, manual loops, `appendChild`, and feature detection where used. Do not replace them just to satisfy a modernization rule. Keep any necessary lint exception narrowly scoped and explain the behavior it protects.
- ES2015 syntax support does not imply every Web API exists. Preserve guards and fallbacks for optional browser APIs and delayed Turnstile loading.
- XHR and fetch wrappers must preserve the caller's receiver, return values, and original arguments except for the intended token injection. In particular, forward all `XMLHttpRequest.open` arguments.
- Preserve request bodies and existing tokens when injection is unnecessary. Maintain the supported body formats and hostname/path matching behavior.
- Update library-owned hidden fields without creating duplicates, and leave user-managed fields alone. Preserve deferred initialization and avoid duplicate Turnstile initialization.
- Validate the actual injected JavaScript, not only its TypeScript source or the outer Worker bundle. Its syntax, minification, and runtime substitutions are separate concerns.

## Validation

Match validation to the change. For documentation-only changes, run formatting and any applicable Markdown lint checks; a full build is unnecessary. For code, compiler, or dependency changes, use the existing commands:

```sh
npm run build
npm run ts:check
npm run lint -- --max-warnings 0
npm run prettier:check
```

Build before linting or checking consumers that resolve the package from `dist/`. Do not run those checks concurrently with a build's clean step. When test types or consumer compatibility are affected, also run:

```sh
node_modules/.bin/tsc -p tsconfig.spec.json --noEmit
node_modules/.bin/tsc -p tests-e2e/tsconfig.json --noEmit
```

For frontend or build changes:

- Check both `npm run build:dev` and `npm run build`, sequentially, inspecting each result before it is replaced by the next build.
- Obtain the script served at `/cftsc.js` from both distributed Worker formats. Check ES2015 parsing, minification, local variable mangling, and completed placeholder substitution. Existing tools such as Espree and Terser can support temporary checks without adding dependencies.
- Exercise affected behavior: XHR/fetch forwarding, body preservation, tokens, form ownership and duplicate prevention, backend matching, missing optional APIs, and delayed Turnstile initialization. Include configured field names such as `cfr`, `cf-turnstile-response`, and `field.with.dots` when changing minification or substitution.
- For packaging changes, inspect `npm pack` output from the built package against its `files` and `exports`; verify declarations and both module formats work for consumers.
- For type-only changes, check that runtime output is unchanged where practical. For compiler/target changes, validate emitted behavior rather than expecting identical bytes.

Do not add `npm run test:frontend` or `tests/frontend-build.spec.mjs` merely to validate a dependency/build update. Use focused temporary checks where sufficient, clean up diagnostic artifacts, and report what was actually verified. The existing placeholder unit test and green CI alone do not establish browser runtime coverage.

## PR workflow

- Inspect the requested PR's current diff, description, checks, and relevant review feedback. Fetch the latest base and head, and preserve existing user changes and already merged fixes.
- When asked to fix or update a PR, carry the authorized work through implementation, appropriate validation, and updating that PR. Keep the final diff focused; check for obsolete files, duplicate configuration, and unnecessary source churn.
- Renovate can refresh its branch while work is in progress. Recheck the remote head before pushing and reconcile new changes; do not overwrite newer remote work with a blind force push.
- Follow the repository's Conventional Commit rules and Git hooks. Browser baseline or public API changes need breaking-change documentation.
- Keep the PR title and description aligned with the final implementation, including relevant validation and material limitations. Verify CI against the final pushed commit, not an earlier green commit.
- Updating a PR does not itself authorize merging, releasing, or deploying it.
