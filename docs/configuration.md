# Configuration

All settings are environment variables. In production, systemd loads them from `/opt/gitroast/.env`, and Probot also loads a `.env` file from the working directory. Start from `.env.example`.

`.env` and `*.pem` files are git-ignored. Never commit them.

## GitHub App

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `APP_ID` | yes | – | The GitHub App's numeric ID |
| `PRIVATE_KEY_PATH` | yes | – | Path to the app's private key `.pem` file. Probot also accepts the key inline as `PRIVATE_KEY` |
| `WEBHOOK_SECRET` | yes | – | Secret GitHub signs webhooks with; unsigned or wrongly signed requests get HTTP 400 |

## Pickers

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `PICKERS` | no | `jev,von,rules` | Order in which pickers are tried, comma-separated |
| `TYPESAFE_API_KEY` | no | – | Enables the Jev picker |
| `VON_BASE_URL` | no | – | Enables the Von picker, for example `http://127.0.0.1:8000` |
| `VON_MODEL` | no | `von-latest` | Model name sent to Von |
| `VON_TIMEOUT_MS` | no | `5000` | Von request timeout. Invalid values fall back to 5000 with a warning |

How `PICKERS` is resolved:

- A picker whose setting is missing is skipped, with the warning `picker "jev" is unknown or not configured; skipping it`. The same happens for unknown names.
- A name listed twice is used once.
- If `rules` is not in the list, it is appended with a warning, so every PR still gets a meme.
- The startup log shows the final order, for example `GitRoast ready; pickers: jev -> von -> rules`.

Common setups:

| Goal | Settings |
|---|---|
| Rules only, nothing leaves your machine except memegen captions | leave `TYPESAFE_API_KEY` and `VON_BASE_URL` empty |
| Jev with rules fallback | `TYPESAFE_API_KEY=…` |
| Fully local model | `VON_BASE_URL=http://127.0.0.1:8000`, `PICKERS=von,rules` |
| Everything | both set, default `PICKERS` |

## Behavior

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `TIMEZONE` | no | `Europe/Zurich` | IANA zone for the Friday-evening and late-night signals. Invalid zones fall back to `UTC` with a warning |

## Server

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `PORT` | no | `3000` | HTTP port |
| `HOST` | no | `localhost` | Bind address. Keep `localhost` when using Cloudflare Tunnel so the port is not exposed |
| `WEBHOOK_PATH` | no | `/api/github/webhooks` | Path GitHub posts to |
| `LOG_LEVEL` | no | `info` | `trace`, `debug`, `info`, `warn`, `error` or `fatal` |

`HOST`, `WEBHOOK_PATH` and `LOG_LEVEL` are read by Probot itself.

## GitHub App permissions

| Permission | Access | Why |
|---|---|---|
| Metadata | Read-only | Required by every GitHub App |
| Pull requests | Read and write | List commits on the PR |
| Issues | Read and write | PR comments use the issues comments API, both to check for an earlier roast and to post |

Subscribe to the **Pull request** event only.
