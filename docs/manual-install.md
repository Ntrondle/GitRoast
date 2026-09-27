# Manual installation

The [installer](../README.md#install) does all of this for you. Use these steps if you want to see or control each one.

## Requirements

- Debian, Raspberry Pi OS or Ubuntu
- Node.js 22 or newer
- A machine that stays on, such as a Raspberry Pi
- A Cloudflare account with a domain, for the tunnel

## 1. Install

A minimal Debian install has neither `sudo` nor `curl`. If `sudo` is missing, add both as root, then log out and back in:

```bash
su -c 'apt-get install -y sudo curl ca-certificates && usermod -aG sudo YOUR_USER'
```

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

- **Homepage URL:** any full URL, for example `https://<your tunnel hostname>` or the GitRoast repo. GitHub requires it but GitRoast does not use it. Include `https://`, or GitHub rejects it.
- **Webhook URL:** `https://<your tunnel hostname>/api/github/webhooks`
- **Webhook secret:** a long random string, for example from `openssl rand -hex 32`. Put it in `.env` as `WEBHOOK_SECRET`. The bot refuses to start while it is empty.
- **Repository permissions:**
  - Metadata: Read-only
  - Pull requests: Read and write
  - Issues: Read and write
- **Subscribe to events:** Pull request

After creating it:

1. Copy the **App ID** into `.env` as `APP_ID`.
2. Generate a private key. GitHub downloads a `.pem` file named after your app. Copy it to the Pi, then install it so only the service user can read it:

   ```bash
   sudo install -o gitroast -g gitroast -m 600 ~/YOUR-APP-NAME.*.private-key.pem /opt/gitroast/gitroast.private-key.pem
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

Debian's repositories don't carry `cloudflared`. Add Cloudflare's repository and install it:

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install -y cloudflared
```

Then create a tunnel that points your hostname at the bot. Run these with `sudo`, so the credentials land in `/root/.cloudflared/`, where the system service looks for them:

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
sudo apt-get install -y python3 python3-venv
sudo mkdir -p /opt/von && sudo chown gitroast: /opt/von
sudo -H -u gitroast python3 -m venv /opt/von/.venv
sudo -H -u gitroast /opt/von/.venv/bin/pip install von-sdk
sudo cp deploy/von.service /etc/systemd/system/
sudo systemctl enable --now von
```

On first start, Von downloads about 2 GB of model weights. This can take a long time on Wi-Fi or a slow SD card, and uses little CPU because it waits on the network and disk, not the processor. Follow it with `journalctl -u von -f`. Until the download finishes, Von requests fail and the rules picker answers instead, so PRs still get memes.

Once Von answers, measure its speed on your hardware:

```bash
cd /opt/gitroast
sudo -H -u gitroast npm run check:systemone -- von
```

Set `VON_TIMEOUT_MS` in `.env` to about twice the slowest time printed, then restart the bot with `sudo systemctl restart gitroast`.
