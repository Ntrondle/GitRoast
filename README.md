# GitRoast

A self-hosted GitHub App that posts a meme on every new pull request. It reads only PR metadata: title, description, labels, file counts, line counts and commit messages. It never reads your code.

Meme choice is swappable. Pickers are tried in order until one answers:

1. **Jev**, TypeSafe AI's hosted decision model. Needs an API key. Sends PR metadata to TypeSafe.
2. **Von**, an open-weights Jev alternative running on your own machine. Needs at least 4 GB of memory, such as a Raspberry Pi 4 or 5.
3. **Rules**, built-in and always on.

Images are rendered by [memegen.link](https://memegen.link). If it is down, the bot posts a text-only roast.

## Documentation

- [Architecture](docs/architecture.md): what each folder is for, what the installer sets up, how a webhook becomes a meme, pickers, and what data leaves your machine
- [Configuration](docs/configuration.md): every environment variable and GitHub App permission
- [Signals and meme catalog](docs/memes.md): what each signal means and which meme it triggers
- [Operations](docs/operations.md): logs, troubleshooting, updating and rotating secrets
- [Development](docs/development.md): tests, adding templates, signals and pickers
- [Manual installation](docs/manual-install.md): every install step, if you'd rather not use the installer

## Install

On Debian, Raspberry Pi OS or Ubuntu, run:

```bash
curl -fsSL https://raw.githubusercontent.com/Ntrondle/GitRoast/main/install.sh | bash
```

Run it as a user with `sudo`, or as root. It detects what the machine already has and only adds what is missing:

- `curl`, `git`, `openssl` and CA certificates
- Node.js 22 from NodeSource, if Node is missing or older
- `cloudflared` from Cloudflare's repository
- a `gitroast` service user, the app in `/opt/gitroast`, and its build
- a `.env` with a generated webhook secret and your system's time zone
- the `gitroast` systemd service, started once the app is configured

It then asks for what only you can provide:

1. **A public hostname** for Cloudflare Tunnel, such as `gitroast.example.com`. It opens Cloudflare's login, creates the tunnel and the DNS record, and starts the tunnel service. Press Enter to skip.
2. **The GitHub App.** It prints the webhook URL, the webhook secret and the permissions to enter at https://github.com/settings/apps/new. Then it asks for the App ID and the private key. You can give a path to the `.pem` file or paste its contents.
3. **A Jev API key**, optionally.

When everything is set, it starts the bot and checks that it answers. Install the app on your repositories and open a pull request to see your first meme.

### Options

```bash
curl -fsSL https://raw.githubusercontent.com/Ntrondle/GitRoast/main/install.sh | bash -s -- --with-von
```

| Option | Effect |
|---|---|
| `--with-von` | Also install Von, the local model. Skipped with a message on machines with less than about 4 GB of memory |
| `--no-tunnel` | Skip Cloudflare Tunnel, for example behind your own reverse proxy |
| `--yes` | Never prompt. Useful for automation |

Answers can also come from environment variables: `GITROAST_APP_ID`, `GITROAST_PRIVATE_KEY_FILE`, `GITROAST_JEV_KEY`, `GITROAST_TUNNEL_HOSTNAME` and `GITROAST_WITH_VON=1`. Put them before `bash`: `curl … | GITROAST_APP_ID=123 bash`.

### Updating

Run the same command again. It pulls the latest version, rebuilds, restarts the service, and never overwrites values already in `.env`.

### Manual installation

Every step the installer takes is listed in [docs/manual-install.md](docs/manual-install.md).

## Development

```bash
npm test          # unit and webhook tests, no network
npm run typecheck
npm run build
```
