# Coolify deployment validation

Validated on 2026-10-29 in the managed Linux development environment. The branch is based on `origin/main` at `0daab5b` (the merged initial TeraStream implementation).

## Audit

- Next.js 16.4.3, React 19.3.1 and Node >=24.15 <25; `.nvmrc` and the Docker base use Node 24.19.0. Docker's Debian bookworm userspace is independent of the target Debian 13 host.
- npm with committed `package-lock.json`; no dependency versions or lockfile changes.
- Existing production build: `npm run build` (`next build --webpack`). Docker uses generated standalone `server.js`, not the development server or `next start`.
- No required secrets, database or external upstream service. Ads default to false and are compiled at build time. Telemetry is disabled in every image stage and Compose runtime.
- The only Next.js configuration change is `output: "standalone"`. Existing CSP, other security headers, URL validation, SSRF transport and mock adapter are unchanged. The original MIT license is unchanged.
- The current app needs no durable filesystem state. Compose uses a read-only root and two bounded temporary writable mounts; no volume or media storage exists. A future change involving ISR/image optimization must revisit filesystem/cache requirements.

## Checks passed

- Clean `npm ci --no-fund --no-audit` from the unchanged lockfile.
- `npm run lint`: no errors or warnings.
- `npm run typecheck`: generated route types and strict TypeScript passed.
- `npm test`: 77 tests passed across four suites.
- `npm run build`: standalone Webpack production build, including `/`, `/api/resolve` and `/api/health`.
- `docker compose config --quiet`: production config parses and retains exactly `10.40.40.242:8082:3000`.
- `docker build -t terastream:local .`: multi-stage build passed. This managed environment requires an additional `--secret id=proxy_ca,src="$CODEX_PROXY_CERT"` for its HTTPS proxy CA. The Dockerfile's optional BuildKit CA mount is not retained in image layers; TLS verification stays enabled. Ordinary Coolify hosts with standard public trust do not need that secret.
- Final image approximately **283 MiB uncompressed**, Node 24.19.0, non-root image user `node`; no tests, Git metadata, local env file, lockfile, ESLint, Vitest or TypeScript installation in the runtime image.

## Container checks passed

The development machine does not own the VM's `10.40.40.242` address. For the smoke test only, a temporary resolved Compose file changed the published endpoint to **127.0.0.1:18082** and used a test project. All production resource and security controls were retained. The committed production binding was not changed.

- `docker compose up -d --no-build --wait --wait-timeout 120` reached **healthy**.
- Homepage returned 200, contained the mock-provider/ad-disabled labels and served eight referenced static assets successfully.
- `/api/health` returned 200, `{"status":"ok"}` and `Cache-Control: no-store`.
- Valid illustrative share POST returned mock metadata, unavailable stream/download links and no-store. A loopback share input returned 400. No real TeraBox fetch was made.
- CSP (`media-src 'none'`), no-referrer and frame-denial headers were present.
- UID/GID 1000:1000, empty effective Linux capabilities, `NoNewPrivs: 1`, read-only root, init process, 512 MiB memory cap, one CPU quota and 128-process limit verified. No Docker socket mount.
- Health script exited 0 against the live app and 1 in a separate no-network container without a listening app. No curl/wget required.
- A unique submitted demo-share marker did not appear in application logs.
- Observed approximately **40.5 MiB** container memory after sequential smoke requests. This is not a load test, full-VM capacity measurement or a guarantee that all three services fit under sustained load.
- `docker compose stop --timeout 20` completed promptly; exit **143** (SIGTERM), `OOMKilled=false`, no runtime error or forced SIGKILL. The test container and its network were then removed. No unrelated service was stopped.

## Not verified here

VM 260 / Debian 13 / Coolify 4.5.3 deployment, the real LAN IP binding and firewall isolation, interaction with PixForge and the Coolify proxy, and aggregate memory/disk capacity on the 3 GB VM require checks on that host after deployment. No live TeraBox streaming/download or advertising integration is implemented or claimed.

The existing GitHub Actions workflow checks the app after a PR is created; local results do not establish a GitHub CI pass. No image-publishing workflow or privileged/self-hosted runner was added. See the README for the optional future GitHub-hosted image-build approach if VM builds run out of memory.
