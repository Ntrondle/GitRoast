# GitRoast

A self-hosted GitHub App that posts a meme on every new pull request. It reads only PR metadata: title, description, labels, file counts, line counts and commit messages. It never reads your code.

Meme choice is swappable. Pickers are tried in order until one answers:

1. **Jev**, TypeSafe AI's hosted decision model. Needs an API key. Sends PR metadata to TypeSafe.
2. **Von**, an open-weights Jev alternative running on your own machine. Needs a Raspberry Pi 4 or 5 with at least 4 GB of memory.
3. **Rules**, built-in and always on.

Images are rendered by [memegen.link](https://memegen.link). If it is down, the bot posts a text-only roast.

## Documentation

- [Architecture](docs/architecture.md): how a webhook becomes a meme, pickers, and what data leaves your machine
- [Configuration](docs/configuration.md): every environment variable and GitHub App permission
- [Signals and meme catalog](docs/memes.md): what each signal means and which meme it triggers
- [Operations](docs/operations.md): logs, troubleshooting, updating and rotating secrets
- [Development](docs/development.md): tests, adding templates, signals and pickers

## Requirements

- Node.js 22 or newer
- A machine that stays on, such as a Raspberry Pi
- A Cloudflare account with a domain, for the tunnel

## 1. Install

Raspberry Pi OS ships an older Node.js. Install Node 22 from NodeSource, which puts it at `/usr/bin/node` where the service file expects it:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v   # v22.x or newer
```

Create a service user whose home is outside the app folder, so npm's cache stays out of the repository:

```bash
sudo useradd --system --create-home --home-dir /var/lib/gitroast --shell /usr/sbin/nologin gitroast
sudo mkdir /opt/gitroast
sudo chown gitroast: /opt/gitroast
sudo -H -u gitroast git clone https://github.com/Ntrondle/GitRoast.git /opt/gitroast
cd /opt/gitroast
sudo -H -u gitroast npm ci
sudo -H -u gitroast npm run build
sudo -H -u gitroast cp .env.example .env
sudo chmod 600 .env   # it will hold secrets
```

Edit `.env` with `sudoedit /opt/gitroast/.env`, which keeps its owner and permissions.

## 2. Create the GitHub App

In GitHub, open **Settings > Developer settings > GitHub Apps > New GitHub App**.

- **Webhook URL:** `https://<your tunnel hostname>/api/github/webhooks`
- **Webhook secret:** a long random string, for example from `openssl rand -hex 32`. Put it in `.env` as `WEBHOOK_SECRET`. The bot refuses to start while it is empty.
- **Repository permissions:**
  - Metadata: Read-only
  - Pull requests: Read and write
  - Issues: Read and write
- **Subscribe to events:** Pull request

After creating it:

1. Copy the **App ID** into `.env` as `APP_ID`.
2. Generate a private key. GitHub downloads a `.pem` file. Copy it to the Pi, then install it so only the service user can read it:

   ```bash
   sudo install -o gitroast -g gitroast -m 600 ~/gitroast.*.private-key.pem /opt/gitroast/gitroast.private-key.pem
   ```

3. Install the app on the repositories you want roasted.

## 3. Configure pickers

Edit `/opt/gitroast/.env`. See `.env.example` for every setting.

- For Jev, set `TYPESAFE_API_KEY`.
- For Von, follow section 5 and set `VON_BASE_URL=http://127.0.0.1:8000`.
- With neither, only the rules picker runs.

Check that Jev answers:

```bash
cd /opt/gitroast
sudo -H -u gitroast npm run check:systemone -- jev
```

## 4. Run the bot and the tunnel

```bash
sudo cp deploy/gitroast.service /etc/systemd/system/
sudo systemctl enable --now gitroast
journalctl -u gitroast -f   # expect "GitRoast ready; pickers: ..."
```

Install `cloudflared`, then create a tunnel that points your hostname at the bot. Run these with `sudo`, so the credentials land in `/root/.cloudflared/`, where the system service looks for them:

```bash
sudo cloudflared tunnel login        # prints a URL; open it and pick your domain
sudo cloudflared tunnel create gitroast   # prints the tunnel ID
sudo cloudflared tunnel route dns gitroast gitroast.example.com
```

Create `/etc/cloudflared/config.yml`, replacing `<tunnel-id>` with the ID printed above:

```yaml
tunnel: gitroast
credentials-file: /root/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: gitroast.example.com
    service: http://localhost:3000
  - service: http_status:404
```

```bash
sudo cloudflared service install
```

Open a pull request on an installed repo. A meme comment should appear within a few seconds. Add the `no-roast` label to a PR to skip it.

## 5. Optional: run Von locally

Von needs about 2 GB of memory, so use a Pi 4 or 5 with 4 GB or more.

```bash
sudo mkdir -p /opt/von && sudo chown gitroast: /opt/von
sudo -H -u gitroast python3 -m venv /opt/von/.venv
sudo -H -u gitroast /opt/von/.venv/bin/pip install von-sdk
sudo cp deploy/von.service /etc/systemd/system/
sudo systemctl enable --now von
```

Measure its speed on your hardware:

```bash
cd /opt/gitroast
sudo -H -u gitroast npm run check:systemone -- von
```

Set `VON_TIMEOUT_MS` in `.env` to about twice the slowest time printed, then restart the bot with `sudo systemctl restart gitroast`.

## Development

```bash
npm test          # unit and webhook tests, no network
npm run typecheck
npm run build
```
