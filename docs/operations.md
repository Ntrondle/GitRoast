# Operations

First-time installation is in the [README](../README.md#install). This page covers running GitRoast afterwards.

## Services

| Service | Unit file | Listens on | Needed |
|---|---|---|---|
| `gitroast` | `deploy/gitroast.service` | `localhost:3000` | always |
| `cloudflared` | installed by `cloudflared service install` | outbound only | always |
| `von` | `deploy/von.service` | `127.0.0.1:8000` | only with the Von picker |

```bash
sudo systemctl status gitroast           # running?
sudo systemctl restart gitroast          # after editing .env
journalctl -u gitroast -f                # live logs
journalctl -u gitroast --since today     # today's logs
```

`gitroast.service` restarts on failure and is capped at 300 MB of memory. The bot normally idles at about 50 MB.

## Reading the logs

| Log line | Meaning |
|---|---|
| `GitRoast ready; pickers: jev -> von -> rules` | Started; shows the picker order in effect |
| `Error: WEBHOOK_SECRET is empty…` | Set `WEBHOOK_SECRET` in `.env`; the bot will not start without it |
| `picker "von" is unknown or not configured; skipping it` | That picker's setting is missing or misspelled in `PICKERS` |
| `roasted #42 with mordor (picked by jev)` | Success |
| `skipping #42: draft` / `bot author` / `no-roast label` / `already roasted` | Intentionally ignored |
| `jev: HTTP 401` | Jev rejected the API key |
| `jev: HTTP 429` or `jev: HTTP 529` | Jev is rate-limiting or overloaded; rules took over |
| `jev: request failed: …` | Network error or timeout; for Von, often the server is down or `VON_TIMEOUT_MS` is too low |
| `jev: malformed response` / `jev: unknown template "…"` | The model answered with something unusable; the next picker took over |
| `no meme picked for #42` | Should not happen, since rules always answers; report it as a bug |
| `POST /api/github/webhooks 400` | A request without a valid signature; check `WEBHOOK_SECRET` if GitHub deliveries fail |

The same messages appear with `von:` for the Von picker.

## Troubleshooting

| Symptom | Check |
|---|---|
| No comment appears | GitHub App settings, **Advanced** tab: are deliveries reaching the tunnel? A 502 means the bot is down; a 400 means `WEBHOOK_SECRET` differs from GitHub's |
| Deliveries succeed, still no comment | `journalctl -u gitroast`: was the PR skipped as a draft, bot, `no-roast` or already roasted? Is the app installed on that repository? |
| `HttpError: Resource not accessible by integration` | The app lacks Pull requests or Issues write permission, or the new permission was not accepted on the installation |
| Text quote instead of an image | memegen.link did not answer the HEAD check within 3 seconds. The next PR will try again |
| Always "picked by rules" | Look for `jev:` or `von:` warnings. No warnings means the picker is not configured; see the startup line |
| Friday or late-night memes at the wrong hours | Set `TIMEZONE` to your IANA zone, such as `America/New_York` |
| A second meme after reopening | Should not happen. The duplicate check only counts bot comments containing `<!-- gitroast -->`; check whether that comment was edited or deleted |

## Checking the pickers

```bash
cd /opt/gitroast
sudo -H -u gitroast npm run check:systemone -- jev
sudo -H -u gitroast npm run check:systemone -- von
```

Each prints one line per sample PR, with the pick, confidence and time. `MISS` on one sample is acceptable. The command fails only if every sample misses.

## Updating

Run the installer again. It pulls the latest version, rebuilds, restarts the service and keeps your `.env`:

```bash
curl -fsSL https://raw.githubusercontent.com/Ntrondle/GitRoast/main/install.sh | bash
```

To update by hand instead:

```bash
cd /opt/gitroast
sudo -H -u gitroast git pull
sudo -H -u gitroast npm ci
sudo -H -u gitroast npm run build
sudo systemctl restart gitroast
```

## Rotating secrets

| Secret | How |
|---|---|
| Jev API key | Create a new key with TypeSafe AI, replace `TYPESAFE_API_KEY` in `.env`, restart, run the Jev check, then revoke the old key |
| Webhook secret | Change it in the GitHub App settings and in `.env` at the same time, then restart |
| App private key | Generate a new key in the GitHub App settings, replace the `.pem` file, restart, then delete the old key on GitHub |

## Opting out

- **One PR:** add the `no-roast` label before opening it, or open it as a draft.
- **One repository:** remove it from the app's installation, under the app's **Install App** settings.
