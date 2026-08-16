# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@infogata/extension-components` — a single-purpose React library published to npm. It exports one provider (`ExtensionProvider`), one hook (`useExtension`), and their types. Consumers pass a `hasExtension: () => boolean` predicate; the library polls it and exposes `extensionDetected: boolean | null`.

## Commands

```bash
npm run dev          # vite dev server
npm run build        # tsc (typecheck + emit .d.ts to dist/) then vite build
npm run lint         # eslint src
npm test             # vitest run (single pass)
npm run test:watch   # vitest watch

npx vitest run src/tests/ExtensionProvider.test.tsx        # single test file
npx vitest run -t "should show loading initially"          # single test by name
```

Node 22 (`.nvmrc`); CI matrixes 20.x/22.x across ubuntu/windows/macOS running lint → build → test.

## Architecture notes

Detection is a three-phase state machine in a single `useEffect` in `src/ExtensionProvider.tsx`:

1. Synchronous check on mount — if the extension is already there, state goes straight to `true` and no interval is ever created.
2. Otherwise poll every `initialPollInterval` (100ms) for `initialPollDuration` (3000ms), with state still `null` (i.e. "unknown", not "absent").
3. At the end of that window, state flips to `false` but polling *continues forever* at `slowPollInterval` (2000ms), so a late-loading extension still flips it to `true`.

Two things to preserve when touching this file:

- The `detected` local is a plain `let`, not state, because the `setTimeout` callback closes over it and needs the value synchronously — reading state there would see a stale render.
- The effect depends on `hasExtension`. An inline arrow from a consumer restarts the whole detection cycle on every render; the README example hoists it to module scope for that reason. Keep it that way in docs/tests.

`useExtension` distinguishes `undefined` context (thrown error — used outside a provider) from a `null` `extensionDetected` (still detecting). Don't collapse those.

## Build/config specifics

- `tsconfig.json` sets `noEmit: true` but `declaration: true` + `declarationDir: ./dist`; the actual `.d.ts` emit for the package comes from `vite-plugin-dts`. The `tsc` step in `build` is effectively the typecheck gate.
- `tsconfig.json` **excludes `src/tests`**, so test files are not typechecked by `npm run build` or CI. Type errors in tests surface only via editor/vitest.
- Vite 8 (rolldown): externals live under `build.rolldownOptions`, not `rollupOptions`. ESM-only output, React and `react/jsx-runtime` external.
- Vitest config is inline in `vite.config.ts` (`test.environment: "happy-dom"`), not a separate file.
- Tests drive the polling with `vi.useFakeTimers()` and wrap advances in `act()` — new timing tests must do the same or they hang.

## Releasing

`dist/` is gitignored; the tarball is built at publish time. Publishing is npm OIDC trusted publishing (no `NPM_TOKEN`), triggered by a `v*` tag:

```bash
npm version <patch|minor|major>
git push --follow-tags
```

The publish workflow verifies the tag matches `package.json` version, so don't hand-craft tags.
