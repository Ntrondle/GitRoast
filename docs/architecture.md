# Architecture

GitRoast is a GitHub App built with [Probot](https://probot.github.io). It turns one pull request webhook into one meme comment. It reads PR metadata only and never requests file contents.

## Request flow

```
GitHub ──webhook──> Cloudflare Tunnel ──> Probot (localhost:3000, /api/github/webhooks)
                                              │ signature verified with WEBHOOK_SECRET
                                              v
                                         handler.ts
             ┌──────────────┬───────────────┼────────────────┬──────────────┐
             v              v               v                v              v
      skipReason     alreadyRoasted   collectMetadata   computeSignals   FallbackPicker
     (payload only)  (list comments)  (list commits)    (pure)           jev → von → rules
                                                                             │
                                              buildCaption ◄─────────────────┘
                                                   │  memegen.link URL
                                                   v
                                      imageReachable (HEAD, 3 s)
                                                   │
                                                   v
                                      postComment (image, or text fallback)
```

1. **Trigger.** The app listens to `pull_request.opened`, `pull_request.reopened` and `pull_request.ready_for_review`.
2. **Cheap skips.** Drafts, PRs opened by bots and PRs labelled `no-roast` are skipped using only the webhook payload. No GitHub API call is made.
3. **Duplicate guard.** The bot lists the PR's comments. If a bot-authored comment already contains the hidden marker `<!-- gitroast -->`, it stops. This covers webhook redelivery and reopened PRs.
4. **Metadata.** The collector combines the webhook payload with one API call that lists up to 50 commits.
5. **Signals.** `computeSignals` turns metadata into booleans such as `titleUndersells` or `isFridayEvening`. See [memes.md](memes.md).
6. **Pick.** Pickers are tried in order until one returns a template. See [Pickers](#pickers).
7. **Caption.** The template's caption is chosen by PR number, its slots are filled, and the text is escaped into a memegen.link image URL.
8. **Comment.** The bot checks the image URL with a HEAD request. If it answers, the comment shows the image. Otherwise the caption is posted as a quote.

## Repository layout

| Path | What it is | Used by |
|---|---|---|
| `src/` | The bot itself, in TypeScript. See [Source layout](#source-layout) | The running service, after a build |
| `test/` | Vitest tests, one file per source unit, plus builders in `fixtures.ts`. See [development.md](development.md#tests) | `npm test` |
| `dist/` | Compiled JavaScript from `npm run build`. Not committed | The `gitroast` service |
| `install.sh` | One-command installer for Debian, Raspberry Pi OS and Ubuntu | The person installing the bot |
| `deploy/` | systemd units: `gitroast.service` runs the bot, `von.service` runs the optional local model | The installer, which copies them to `/etc/systemd/system/`, pointing `gitroast.service` at the machine's `node` |
| `scripts/systemone-check.ts` | Sends one real request to Jev or Von and prints the answer. Run it with `npm run check:systemone -- jev` or `-- von` | You, when a picker is not answering |
| `scripts/test-install.sh` | Runs `install.sh` in fresh Debian and Ubuntu containers and checks the result. Needs Docker | You, before changing the installer |
| `.env.example` | Every setting with its default. The installer copies it to `.env` | The installer and manual installs |
| `docs/` | These documents. `docs/superpowers/` holds the original design spec and implementation plan | Readers |

The unit tests run without network access. The two scripts in `scripts/` touch real services, so they never run in CI.

### What the installer sets up

`install.sh` works in steps, and running it again skips what is already done:

1. Checks the OS, CPU and `sudo`, then installs `curl`, `git`, `openssl` and Node.js 22 if they are missing.
2. Creates the `gitroast` service user and clones this repository into `/opt/gitroast`. On later runs it fast-forwards the checkout instead.
3. Runs `npm ci` and `npm run build` as that user.
4. Creates `/opt/gitroast/.env` from `.env.example` with a generated `WEBHOOK_SECRET` and your time zone. It never overwrites values that are already set.
5. Sets up Cloudflare Tunnel, unless you pass `--no-tunnel`.
6. Prints the GitHub App settings, then asks for the App ID, the private key and an optional Jev key. The key is stored as `/opt/gitroast/gitroast.private-key.pem`, readable only by the service user.
7. Installs Von if you pass `--with-von`.
8. Installs `gitroast.service`. Once the App ID and private key are set, it starts the service and waits until the bot rejects an unsigned test webhook, which proves it is up and checking signatures.

On the machine, the running bot is `node` running `probot run ./dist/index.js` from `/opt/gitroast`, reading its settings from `.env`. systemd restarts it on failure and caps it at 300 MB of memory.

## Source layout

| File | Responsibility | Talks to |
|---|---|---|
| `src/index.ts` | Probot entry point; wires config, pickers and handler | – |
| `src/config.ts` | Reads environment, builds the picker list, validates the time zone | – |
| `src/handler.ts` | The flow above; the only place that sequences the steps | – |
| `src/collector.ts` | Builds `PrMetadata`; the only GitHub reader | GitHub API |
| `src/commenter.ts` | Duplicate check, image check, comment rendering and posting; the only GitHub writer | GitHub API, memegen.link |
| `src/signals.ts` | Metadata to signals; pure | – |
| `src/templates.ts` | The meme catalog; data only | – |
| `src/captions.ts` | Slot filling and memegen escaping; pure | – |
| `src/pickers/systemone.ts` | HTTP picker for any System One server (Jev, Von) | Jev or Von |
| `src/pickers/rules.ts` | Priority-based picker; never fails | – |
| `src/pickers/fallback.ts` | Tries pickers in order | – |
| `src/types.ts`, `src/context.ts` | Shared types | – |

Pure units have no network or GitHub access, so they are tested directly. The three units that talk to the outside world are tested with injected `fetch` functions or with nock.

## Pickers

Every picker implements one interface:

```ts
interface Picker {
  readonly name: string;
  pick(meta: PrMetadata, signals: Signals, templates: Template[]): Promise<PickResult | null>;
}
```

Returning `null` means "I can't decide, ask the next one."

| Picker | Where it runs | Returns null when | Timeout |
|---|---|---|---|
| `jev` | TypeSafe AI's hosted API | HTTP error, network error, timeout, malformed body, choice `other`, unknown template, confidence under 0.5 | 2 s |
| `von` | Your machine, `VON_BASE_URL` | Same as Jev | `VON_TIMEOUT_MS`, default 5 s |
| `rules` | In process | Never | – |

Jev and Von speak the same System One API, so one class, `SystemOnePicker`, serves both. It sends one `choice` question whose options are each template's `description` plus `other`:

```json
{
  "model": "jev-latest",
  "state": { "pull_request": { "title": "…", "body": "first 1000 chars", "labels": [], "…": "…" }, "signals": { "…": "…" } },
  "questions": {
    "meme": {
      "type": "choice",
      "instructions": "Which meme template best captures the irony or humor of this pull request?",
      "criteria": { "mordor": "The title calls the change small…", "…": "…", "other": "None of these memes fits this pull request." }
    }
  }
}
```

The rules picker matches each template's `rule.all` list of signals and picks the highest `priority`. If nothing matches, it returns the generic `fry` template. Because it never returns `null`, `config.ts` always appends it, so every PR gets a meme.

## Data leaving your machine

| Destination | What is sent | When |
|---|---|---|
| GitHub | API calls with the app's installation token | Every handled PR |
| TypeSafe AI (Jev) | PR number, title, first 1000 characters of the body, labels, file and line counts, commit messages, creation time, author login, computed signals | Only if `TYPESAFE_API_KEY` is set |
| Von | Same as Jev, but to your own server | Only if `VON_BASE_URL` is set |
| memegen.link | The filled caption text, as part of the image URL | Every meme; GitHub's image proxy also fetches it |

File contents and diffs are never requested, so they can't be sent anywhere.

## Design decisions

- **Always-on process, not scale-to-zero.** The idle bot uses about 50 MB of memory and no CPU. Tooling that starts it on demand would cost more than it saves.
- **memegen.link renders images.** The bot builds URLs instead of drawing images, so it stores nothing and needs no image libraries.
- **Deterministic captions.** The caption index is the PR number modulo the caption count, so a redelivered webhook produces the same text.
- **No SDKs for pickers.** Pickers use built-in `fetch`. The only runtime dependency is `probot`.
