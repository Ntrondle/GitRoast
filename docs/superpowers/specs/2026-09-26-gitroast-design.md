# GitRoast design

Date: 2026-09-26
Status: approved 2026-09-26, with the Von local picker added

## Goal

GitRoast is a self-hosted clone of [LGTMeme](https://lgtmeme.com). It is a GitHub App that posts a meme on every new pull request. The meme is chosen from PR metadata only. It never reads file contents.

It runs on the owner's own hardware, with no GPU. It must cost almost nothing while idle and do work only when a PR arrives.

### What the user decided

- CPU-only hardware. A Raspberry Pi-class machine must be enough.
- The meme picker is swappable. Jev, TypeSafe AI's hosted decision model, is the main picker. Von, an open-weights copy of Jev, can run on the device as a second picker. A local rule-based picker is the last fallback. Sending PR metadata to TypeSafe is acceptable.
- GitHub reaches the bot through Cloudflare Tunnel. No router ports are opened.
- Meme images are rendered by memegen.link. The bot only builds URLs. Captions are sent to memegen.link, which is acceptable.
- The bot is written in TypeScript with Probot and runs as a long-lived systemd service.

### Success criteria

1. Opening a PR on a repo where the app is installed produces exactly one meme comment within about five seconds.
2. The meme fits the PR. Both Jev and the rule picker pick a template that matches the most notable signal.
3. With Jev unreachable, the bot still posts a meme from the rule picker.
4. The bot never requests file contents from GitHub.
5. Idle memory use stays under 150 MB, and idle CPU use is near zero.

### Out of scope for v1

- Billing, quotas or per-repo meme limits.
- A web dashboard or gallery.
- Reacting to events other than a PR being opened, reopened or marked ready for review.
- Running Von on a Raspberry Pi with less than 4 GB of memory. See "Local model picker: Von".

## Architecture

```
GitHub ──webhook──> Cloudflare Tunnel ──> Probot app (systemd, Node 22)
                                              │
                        ┌─────────────────────┼──────────────────────┐
                        v                     v                      v
                  collector.ts          signals.ts             pickers/
               (GitHub API, metadata)  (pure function)  systemone.ts │ rules.ts │ fallback.ts
                                              │
                                              v
                                        captions.ts ──> memegen.link URL
                                              │
                                              v
                                        commenter.ts ──> PR comment
```

### Flow

1. GitHub sends a `pull_request` webhook for `opened`, `reopened` or `ready_for_review`. Probot verifies the signature using the webhook secret.
2. The handler skips the PR if any of these hold:
   - It is a draft.
   - Its author is a bot, meaning the user type is `Bot`.
   - It has the label `no-roast`.
   - The bot already commented on it. This guards against webhook redelivery.
3. The collector builds a `PrMetadata` object from the webhook payload plus one API call that lists commits. Fields:
   - title, body, labels
   - changed file count, additions, deletions
   - commit messages, at most the first 50
   - created time, in the repo owner's configured time zone
   - author login
4. `computeSignals(meta)` returns a `Signals` object of named booleans and numbers.
5. The picker returns `{ templateId, confidence, source }`, where source is `jev`, `von` or `rules`.
6. `buildCaption(template, meta, signals)` picks a caption line and fills its slots. It returns the memegen URL and the plain caption text.
7. The commenter checks the image URL with a HEAD request and a three-second timeout. It then posts either the image comment or a text-only fallback.

## Units

Each unit lives in its own file under `src/` and is tested on its own.

### `types.ts`

Shared types: `PrMetadata`, `Signals`, `BooleanSignal`, `Template`, `PickResult`, `Picker`. `context.ts` holds the Probot `PrContext` type.

```ts
interface Picker {
  pick(meta: PrMetadata, signals: Signals, templates: Template[]): Promise<PickResult | null>;
}
```

A picker returns `null` when it cannot decide. That makes the next picker run.

### `collector.ts`

This is the only unit that reads from GitHub. It uses the webhook payload plus `GET /repos/{owner}/{repo}/pulls/{number}/commits`. It never calls the contents, files or diff endpoints.

### `signals.ts`

A pure function. v1 signals:

| Signal | Definition |
|---|---|
| `linesChanged` | additions plus deletions |
| `isHuge` | more than 1000 lines changed or more than 30 files |
| `isTiny` | fewer than 10 lines changed |
| `titleUndersells` | title contains a small word, like typo, small, minor, quick, tweak or nit, and `isHuge` |
| `isRevert` | title starts with "Revert" or a label contains "revert" |
| `isRefactor` | title or labels contain "refactor" |
| `isFridayEvening` | created Friday after 16:00 |
| `isLateNight` | created between 00:00 and 05:00 |
| `wipCommits` | count of commit messages matching wip, fix, oops, again or typo |
| `hasWipCommits` | `wipCommits` is 3 or more; rules match on booleans only |
| `deletesMoreThanAdds` | deletions more than twice additions and more than 100 lines |
| `noDescription` | body empty or under 20 characters |
| `manyCommits` | more than 20 commits |

### `templates.ts`

The template catalog, a typed array, so the type checker validates rule signal names. Each entry has these fields:

- `id`: the memegen.link template ID. The implementation plan must check every ID against `https://api.memegen.link/templates`.
- `name`
- `lines`: how many text boxes the memegen template has
- `description`: what situation fits the template. Jev reads this as the choice criteria.
- `rule`: a condition on signals, with a priority. The rule picker uses it.
- `captions`: a list of caption lines. Each line has one text per meme box, for example top and bottom, and may contain slots such as `{files}`, `{lines}`, `{title}`, `{author}` and `{commits}`.

v1 ships about 12 templates. They cover every signal above plus a generic "looks good" fallback template for PRs with no notable signal.

### `pickers/systemone.ts`

One picker class for any server that speaks TypeSafe's System One API. Jev and Von both do, so the same code serves both. It is constructed with a name, a base URL, an optional API key, a model name and a timeout.

It sends one request to `POST {baseUrl}/v1/systemone`. The state is the PR metadata and signals. It asks one `choice` question. The criteria are every template's description plus an `other` option.

- It returns `null` on any HTTP error, on a timeout, when the choice is `other`, or when confidence is under 0.5.
- When an API key is set, it is sent as `Authorization: Bearer <key>`.

It calls the HTTP API directly with `fetch`, not an SDK. That keeps the dependency list short and makes the request easy to record for tests. The 2026-09-26 test call against Jev confirmed this request shape.

`index.ts` builds two instances from config:

| Name | Base URL | Model | Key | Timeout | Enabled when |
|---|---|---|---|---|---|
| `jev` | `https://api.typesafe.ai` | `jev-latest` | `TYPESAFE_API_KEY` | 2 s | the key is set |
| `von` | `VON_BASE_URL` | `VON_MODEL` | none | `VON_TIMEOUT_MS` | the URL is set |

### `pickers/rules.ts`

Evaluates each template's rule against the signals. It returns the matching template with the highest priority, with confidence 1. If nothing matches, it returns the generic template. It never returns `null`.

### `pickers/fallback.ts`

Wraps a list of pickers and returns the first non-null result. The order comes from `PICKERS`, for example `jev,von,rules`. Unknown or disabled pickers are skipped with a warning at startup. Errors thrown by a picker are logged and treated as `null`.

### `captions.ts`

Chooses a caption line at random, seeded by the PR number so redeliveries give the same result. It fills slots and escapes each text for memegen:

| Character | Encoding |
|---|---|
| space | `_` |
| `_` | `__` |
| `-` | `--` |
| `?` | `~q` |
| `&` | `~a` |
| `%` | `~p` |
| `#` | `~h` |
| `/` | `~s` |
| `\` | `~b` |
| `<` | `~l` |
| `>` | `~g` |
| `"` | `''` |
| newline | `~n` |

Slot values are trimmed to 60 characters. The result is `https://api.memegen.link/images/{id}/{text1}/{text2}.png`.

### `commenter.ts`

This is the only unit that writes to GitHub. It posts one issue comment on the PR:

```md
![{caption text}]({memegen url})

<sub>🔥 GitRoast · picked by {source} · add the `no-roast` label to opt out</sub>
```

If the image check fails, it posts the caption as a quote with the same footer.

It finds existing comments by looking for a hidden marker, `<!-- gitroast -->`, in comments from the app's bot user.

### `index.ts`

Probot entry point. It wires the handler to the three events and builds the picker chain from config.

## Configuration

All settings come from environment variables in a git-ignored `.env` file.

| Variable | Required | Meaning |
|---|---|---|
| `APP_ID` | yes | GitHub App ID |
| `PRIVATE_KEY_PATH` | yes | path to the app's private key file |
| `WEBHOOK_SECRET` | yes | webhook secret |
| `TYPESAFE_API_KEY` | no | enables the Jev picker |
| `PICKERS` | no | picker order, default `jev,von,rules` |
| `VON_BASE_URL` | no | enables the Von picker, for example `http://localhost:8000` |
| `VON_MODEL` | no | model name sent to Von, default `von-latest` |
| `VON_TIMEOUT_MS` | no | default `5000`, since Pi CPU speed is unmeasured |
| `TIMEZONE` | no | used for time signals, default `Europe/Zurich` |
| `PORT` | no | default `3000` |

GitHub App permissions:
- Metadata: read
- Pull requests: read and write
- Issues: write. Needed because PR comments use the issues comments API.
- Subscribed events: pull request.

## Error handling

| Failure | Behavior |
|---|---|
| Jev or Von timeout, 401, 422, 429, 529 or network error | Log a warning, try the next picker |
| Jev or Von picks `other` or confidence under 0.5 | Try the next picker |
| memegen.link does not respond | Post the text-only comment |
| GitHub API error while collecting | Probot retries. If it still fails, log and skip the PR |
| GitHub API error while commenting | Same as above |
| Duplicate webhook | Skipped by the marker check |

Logs use Probot's built-in logger, pino, to stdout, which systemd's journal captures.

## Testing

- Test runner: Vitest.
- `signals.ts`, `rules.ts` and `captions.ts` get table-driven unit tests. Captions tests cover every escape rule.
- `systemone.ts` is tested with recorded responses served by a fake `fetch`. The tests cover success, low confidence, `other`, timeout and each error status.
- `fallback.ts` is tested with stub pickers.
- The handler is tested with a Probot test instance, a fixture `pull_request.opened` payload and nock for GitHub and memegen. It checks that exactly one comment is posted and that skips work.
- A test asserts that the collector never calls the contents, files or diff endpoints.
- `scripts/systemone-check.ts` sends one real request to Jev or to a local Von server and prints the pick and the time taken. It is run by hand, never in CI. Run on the Pi against Von, it measures real CPU latency, which sets `VON_TIMEOUT_MS`.

## Deployment

- Node 22 LTS, which runs on any 64-bit Raspberry Pi OS.
- `npm run build` produces `dist/`.
- `deploy/gitroast.service` is a systemd unit that runs `node dist/index.js` with `EnvironmentFile=.env` and restarts on failure.
- `deploy/von.service` runs `von serve --host 127.0.0.1 --port 8000` when Von is used. Binding to localhost keeps it off the network.
- `cloudflared` runs as its own systemd service. It maps a hostname such as `gitroast.example.com` to `http://localhost:3000`.
- The README covers creating the GitHub App, setting permissions and the webhook URL, installing it on repos, and setting up the tunnel.

## Local model picker: Von

Chosen on 2026-09-26 as the open model closest to Jev.

**Why Von:**
- It is built the same way as Jev. It is a non-autoregressive encoder, ModernBERT-Large with 395M parameters, that answers in one pass instead of writing text.
- It serves the same `/v1/systemone` API with the same choice, yes-or-no and score questions. So the Jev picker code works against it with only a different base URL.
- It is Apache-2.0 licensed and supports multithreaded CPU inference.

**Other candidates:**
- Kev also serves the same API, but its smallest size is 0.8B parameters, a fine-tuned decoder model. That makes it heavier for the same job.
- Laya is similar in size, but sources disagree on whether it serves the same API.

**Limits to know:**
- Accuracy is lower than Jev. Von 1.1 scores 72.0% on the jabr v2 benchmark, against 96.6% for Jev. That is why the default order keeps Jev first.
- It needs about 2 GB of memory for the model and runtime. That rules out a Pi Zero 2 W and 1 or 2 GB boards. A Raspberry Pi 4 or 5 with 4 GB or more is required, and 8 GB is safer.
- Nobody has published Raspberry Pi latency numbers. The implementation plan must include measuring it on the target Pi before relying on it.
- The Von server keeps the model in memory while idle. This uses memory, not meaningful CPU or power. It is the one exception to success criterion 5, which applies to the bot process only.
