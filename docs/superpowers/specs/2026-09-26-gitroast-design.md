# GitRoast design

Date: 2026-09-26
Status: draft, awaiting review

## Goal

GitRoast is a self-hosted clone of [LGTMeme](https://lgtmeme.com). It is a GitHub App that posts a meme on every new pull request. The meme is chosen from PR metadata only. It never reads file contents.

It runs on the owner's own hardware, with no GPU. It must cost almost nothing while idle and do work only when a PR arrives.

### What the user decided

- CPU-only hardware. A Raspberry Pi-class machine must be enough.
- The meme picker is swappable. Jev, TypeSafe AI's hosted decision model, is the main picker. A local rule-based picker is the fallback. Sending PR metadata to TypeSafe is acceptable.
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
- A local model picker. The picker interface allows adding one later. See "Future: local model picker".

## Architecture

```
GitHub ──webhook──> Cloudflare Tunnel ──> Probot app (systemd, Node 22)
                                              │
                        ┌─────────────────────┼──────────────────────┐
                        v                     v                      v
                  collector.ts          signals.ts             pickers/
               (GitHub API, metadata)  (pure function)   jev.ts │ rules.ts │ fallback.ts
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
5. The picker returns `{ templateId, confidence, source }`, where source is `jev` or `rules`.
6. `buildCaption(template, meta, signals)` picks a caption line and fills its slots. It returns the memegen URL and the plain caption text.
7. The commenter checks the image URL with a HEAD request and a three-second timeout. It then posts either the image comment or a text-only fallback.

## Units

Each unit lives in its own file under `src/` and is tested on its own.

### `types.ts`

Shared types: `PrMetadata`, `Signals`, `Template`, `PickResult`, `Picker`.

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
| `deletesMoreThanAdds` | deletions more than twice additions and more than 100 lines |
| `noDescription` | body empty or under 20 characters |
| `manyCommits` | more than 20 commits |

### `templates.json`

The template catalog. Each entry has these fields:

- `id`: the memegen.link template ID. The implementation plan must check every ID against `https://api.memegen.link/templates`.
- `name`
- `description`: what situation fits the template. Jev reads this as the choice criteria.
- `rule`: a condition on signals, with a priority. The rule picker uses it.
- `captions`: a list of caption lines. Each line has one text per meme box, for example top and bottom, and may contain slots such as `{files}`, `{lines}`, `{title}`, `{author}` and `{commits}`.

v1 ships about 12 templates. They cover every signal above plus a generic "looks good" fallback template for PRs with no notable signal.

### `pickers/jev.ts`

Sends one request to `POST https://api.typesafe.ai/v1/systemone` with model `jev-latest`. The state is the PR metadata and signals. It asks one `choice` question. The criteria are every template's description plus an `other` option.

- Timeout: two seconds.
- It returns `null` on any HTTP error, on a timeout, when the choice is `other`, or when confidence is under 0.5.
- The API key comes from `TYPESAFE_API_KEY`. The picker is disabled when the key is missing.

It calls the HTTP API directly with `fetch`, not the SDK. That keeps the dependency list short and makes the request easy to record for tests. The 2026-09-26 test call confirmed this request shape.

### `pickers/rules.ts`

Evaluates each template's rule against the signals. It returns the matching template with the highest priority, with confidence 1. If nothing matches, it returns the generic template. It never returns `null`.

### `pickers/fallback.ts`

Wraps a list of pickers and returns the first non-null result. The configured order is `jev,rules` or just `rules`. Errors thrown by a picker are logged and treated as `null`.

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
| `PICKERS` | no | picker order, default `jev,rules` |
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
| Jev timeout, 401, 422, 429, 529 or network error | Log a warning, fall back to rules |
| Jev picks `other` or confidence under 0.5 | Fall back to rules |
| memegen.link does not respond | Post the text-only comment |
| GitHub API error while collecting | Probot retries. If it still fails, log and skip the PR |
| GitHub API error while commenting | Same as above |
| Duplicate webhook | Skipped by the marker check |

Logs use Probot's built-in logger, pino, to stdout, which systemd's journal captures.

## Testing

- Test runner: Vitest.
- `signals.ts`, `rules.ts` and `captions.ts` get table-driven unit tests. Captions tests cover every escape rule.
- `jev.ts` is tested with recorded responses served by a fake `fetch`. The tests cover success, low confidence, `other`, timeout and each error status.
- `fallback.ts` is tested with stub pickers.
- The handler is tested with a Probot test instance, a fixture `pull_request.opened` payload and nock for GitHub and memegen. It checks that exactly one comment is posted and that skips work.
- A test asserts that the collector never calls the contents, files or diff endpoints.
- `scripts/jev-live-check.ts` sends one real request to Jev. It is run by hand, never in CI.

## Deployment

- Node 22 LTS, which runs on any 64-bit Raspberry Pi OS.
- `npm run build` produces `dist/`.
- `deploy/gitroast.service` is a systemd unit that runs `node dist/index.js` with `EnvironmentFile=.env` and restarts on failure.
- `cloudflared` runs as its own systemd service. It maps a hostname such as `gitroast.example.com` to `http://localhost:3000`.
- The README covers creating the GitHub App, setting permissions and the webhook URL, installing it on repos, and setting up the tunnel.

## Future: local model picker

Checked on 2026-09-26. The picker interface lets a third picker run fully on the device. Two options:

1. An open Jev copy, such as Laya with about 421M parameters and about 1 GB of memory, or Von with about 395M parameters. These appeared within weeks of Jev's release. None has published Raspberry Pi benchmarks, so they need testing on a Pi 4 or Pi 5 with 2 GB or more.
2. A small sentence-embedding model, such as all-MiniLM-L6-v2 with 22M parameters, run through ONNX Runtime. It compares a text summary of the PR against each template description. A softmax over the similarities gives Jev-like probabilities. This fits in the memory of any Raspberry Pi, including a Pi Zero 2 W.

Either becomes `pickers/local.ts` and slots into the `PICKERS` order.
