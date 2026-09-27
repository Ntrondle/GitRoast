# Development

## Setup

Requires Node.js 22 or newer.

```bash
npm ci
npm test            # all tests, no network needed
npm run typecheck
npm run build       # compiles src/ to dist/
```

## Tests

| File | Covers |
|---|---|
| `test/signals.test.ts` | Every signal, time zones, an empty PR |
| `test/templates.test.ts` | Catalog integrity: unique IDs and descriptions, generic templates, caption lengths, known slots, one priority per signal, every signal covered by at least two templates |
| `test/captions.test.ts` | memegen escaping, slot filling, truncation, deterministic caption choice |
| `test/pickers/rules.test.ts` | Priorities, rotation between templates on the same signal, and that every template can be reached |
| `test/pickers/systemone.test.ts` | Request shape, confidence threshold, `other`, unknown IDs, malformed bodies, HTTP errors, timeouts; uses a fake `fetch` |
| `test/pickers/fallback.test.ts` | Picker ordering and error isolation |
| `test/commenter.test.ts` | Comment rendering, mention defusing, image check |
| `test/handler.test.ts` | The full webhook flow with a real Probot instance and nock |
| `test/config.test.ts` | Picker selection from environment, time zone validation |

The handler test disables all real network access. Any GitHub or memegen request without a matching mock fails the test. That is how it proves the bot never touches file contents and that skipped PRs make no API calls. The file takes about 6 seconds because it generates an RSA key.

Test data builders live in `test/fixtures.ts`. `makeMeta()` is a plain Tuesday-morning PR that triggers no signal. `makeSignals()` has every flag off. Override only what a test needs.

## Adding a meme template

1. Pick a template ID from `https://api.memegen.link/templates` and note its `lines` count.
2. Add an entry to `src/templates.ts` with `id`, `name`, `lines`, a `description` written for Jev and Von, a `rule` made with `on("signalName")` or `generic`, and at least one caption with exactly `lines` entries. Use `""` for a text box that should stay empty.
3. Run `npm test`. The catalog tests catch wrong caption lengths, unknown slots and unknown signal names.
4. Check the ID and text box count against `https://api.memegen.link/templates/<id>`. The tests can't, because they run offline.
5. Update the table in [memes.md](memes.md).

The `description` is what Jev and Von use to choose, so describe the situation the meme fits, not the image.

## Adding a signal

1. Add the field to `Signals` in `src/types.ts`.
2. Compute it in `src/signals.ts`.
3. Add it, set to its "off" value, to `makeSignals()` in `test/fixtures.ts`.
4. Add a case to `test/signals.test.ts`.
5. Give it a priority in `PRIORITY` in `src/templates.ts`, and at least two templates using `on("yourSignal")`. The catalog test fails until it has two.

## Adding a picker

1. Implement the `Picker` interface in `src/pickers/`. Return `null` when unsure; don't throw for expected failures.
2. Register it in the `available` map in `buildPickers` in `src/config.ts`, enabled only when its settings exist.
3. Add tests with an injected `fetch` or equivalent, so they never hit the network.
4. Document its settings in [configuration.md](configuration.md) and `.env.example`.

A server that speaks TypeSafe's System One API needs no new code. Construct another `SystemOnePicker` with its URL.

## Conventions

- ESM with `NodeNext` resolution: relative imports end in `.js`, even from `.ts` files.
- Strict TypeScript with `noUncheckedIndexedAccess`.
- `probot` is the only runtime dependency. Use built-in `fetch` for HTTP.
- Only `collector.ts` reads from GitHub and only `commenter.ts` writes to it.
- Never commit `.env` or `.pem` files.

## Design documents

- Spec: [superpowers/specs/2026-09-26-gitroast-design.md](superpowers/specs/2026-09-26-gitroast-design.md)
- Implementation plan: [superpowers/plans/2026-09-26-gitroast.md](superpowers/plans/2026-09-26-gitroast.md)
