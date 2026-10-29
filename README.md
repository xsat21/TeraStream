# TeraStream

An original, MIT-licensed, privacy-conscious foundation for a TeraBox public-share viewer, video player, and downloader. Independent from and not endorsed by TeraBox.

**Status: mock provider only.** The interface shows an explicitly labeled sample file for valid share links. It does not resolve real file information, play TeraBox videos, or download files. No live streaming tests have been performed; direct streaming is **not verified**. Watch and Download explore the intended workflow and explain the current limitation.

## Official integration status (Phase 2)

For the current operator-owned live-probe assessment, offline CLI and exact missing prerequisites, see [PR #5 live-probe status](docs/terabox-live-probe.md). `npm run probe:terabox` intentionally exits 2 while no API contract is verified; it does not send metadata or video requests.

This phase adds a **fail-closed official-provider boundary**, not a working TeraBox API integration. The official documentation request was rejected by this environment's egress proxy, and no issued TeraBox credentials or authorized test shares are available. No endpoint parameters, response schemas, OAuth workflow or public-share download permissions have been guessed. See [integration status and blockers](docs/terabox-integration-status.md).

Set the server-only **runtime** variable `TERASTREAM_PROVIDER=mock` (default) for demo mode, or `TERASTREAM_PROVIDER=official` to select the blocked official adapter. With Docker Compose/Coolify, set that variable in the resource's runtime environment and recreate/redeploy the container; it is not an image build argument. The server-rendered page reads mode at request time. Unknown or empty values fail closed. The browser cannot select or override the provider using request fields.

In official mode, the page visibly reports that integration is not configured and `/api/resolve` returns **503** with code `documentation_unverified`. No sample filename, real metadata, streaming URL or download URL is returned. It does not contact TeraBox or fall back to mock. `/api/health` remains application liveness, not provider readiness. A newly selected official mode does not establish real API capability.

No credential variables are supported yet: naming them or implementing token exchange/storage before reviewing the real authorization contract would invent requirements. Do not add cookies, client secrets, refresh/access tokens or API keys to `NEXT_PUBLIC_*`, Docker build args, Git or logs. There is no OAuth callback or token storage. A future authorization implementation must verify the official workflow, scope, expiry/refresh semantics, CSRF state, PKCE where applicable, safe server-side token storage and permitted content before enabling network requests.

The internal provider DTO validator rejects malformed metadata, unsafe filenames, extra fields, mismatched mock/live provenance and all claimed verified media links. This is validation of **TeraStream's internal contract**, not validation of a documented TeraBox response schema. Playback/download controls stay placeholders, and the existing CSP (`media-src 'none'`), URL allowlist, SSRF transport and no-media-storage policy remain unchanged. Internal error categories distinguish unsupported, unauthorized, expired authorization, unavailable and unverified states; tests simulating those categories are not live authorization tests. Folders/multi-file shares cannot be resolved until their documented contracts are reviewed.

## Develop locally

The MP4/HLS player foundation is implemented and tested with project-owned synthetic fixtures. It does **not** enable TeraBox playback: the official adapter and provider response quarantine are unchanged, and the production media approval list is empty. See [player architecture, fixture contract and validation](docs/video-playback.md).

Use Node.js **24.19.0** (see `.nvmrc`; supported runtime is Node 24 >=24.15) and npm. No accounts, API credentials, database, or external services are needed.

```sh
nvm use                 # if you use nvm
npm ci
cp .env.example .env.local  # optional; ads are already disabled by default
npm run dev
```

Open your local development server on port 3000. Try `https://www.terabox.com/s/demo` as an illustrative URL; it is not a real content fixture. Use only public content you own or are authorized to access.

```sh
npm run lint
npm run typecheck       # generates Next.js route types, then checks TypeScript
npm test                # URL, SSRF transport, API and component tests
npm run build
# Or run all checks with npm run check
```

For a local production launch with standalone output, copy its static assets and run the generated server (Docker does these copies automatically):

```sh
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
HOSTNAME=127.0.0.1 PORT=3000 NEXT_TELEMETRY_DISABLED=1 node .next/standalone/server.js
```

The existing `npm start` script remains the conventional Next.js CLI command; Next.js recommends the generated `server.js` for standalone deployment.

CI runs a frozen `npm ci` followed by `npm run check` on pull requests and pushes to `main`. Package versions are pinned and the lockfile is committed. See [version verification](docs/dependencies.md) for registry evidence and compatibility choices.

## Deploy with Coolify 4.5.3 (LAN only)

Target: Debian 13 on Proxmox VM **260**, LAN IP **10.40.40.242**, 3 GB RAM. TeraStream uses **8082**; PixForge stays on **8081**, Coolify on **8000**, and its proxy keeps **80/443/8080**. No domain, Cloudflare Tunnel, database, external service or persistent volume is needed. The mock provider remains the only provider; live TeraBox playback/downloads are not verified or enabled.

After merging the deployment PR into `main`:

1. In Coolify, add an application from the public repository `https://github.com/xsat21/TeraStream`, select the VM's destination, and choose **Docker Compose** as the build strategy (not Nixpacks or a single Dockerfile application).
2. Set branch **`main`**, base directory **`/`**, and Compose file **`/docker-compose.yml`**. Leave service domains empty and do not add a proxy route or generated public domain. Coolify still needs repository read access and outbound access to Docker Hub and npm during builds.
3. Inspect the resolved Compose configuration: service `terastream` must retain **`10.40.40.242:8082:3000`**. Container port is **3000**, host port is **8082**; do not add another host-port mapping in Coolify. Keep the configured health check and security/resource settings. Do not mount the Docker socket or enable privileged mode. Review the generated config after any Coolify UI override.
4. No secrets are required. Leave `NEXT_PUBLIC_ADS_ENABLED` unset (or `false`). It is a **build argument**, so changes require a rebuild; `true` enables only the isolated ad placeholder, never an ad network. Runtime Node settings and disabled telemetry are already in Compose. Do not upload `.env.local` or credentials to Git.
5. Deploy and wait for the `terastream` container to become **healthy**. The check calls `/api/health` locally using Node, every 30 seconds with a 30-second startup grace period, a 5-second timeout and three retries. A healthy result establishes app responsiveness, not TeraBox connectivity or streaming capability.
6. From an allowed LAN client, access **http://10.40.40.242:8082**. Confirm the demo labels, URL error state and mock metadata; the API and player must not imply real media works. Also check `http://10.40.40.242:8082/api/health` returns `{"status":"ok"}`. Never submit a private share as a deployment test.

The Dockerfile pins Node **24.19.0**, installs the unchanged lockfile using `npm ci`, runs the existing Webpack production build, and copies only standalone output, static/public assets, the health script and MIT license to the runtime stage. The service listens on `0.0.0.0:3000` **inside** the container as UID/GID **1000:1000**, with a read-only root filesystem, no capabilities and no new privileges. Only bounded `/tmp` and Next.js cache tmpfs mounts are writable; both are discarded on container removal. They contain no user-media pipeline. No database or volume is added. Reassess these mounts if future work adds ISR, image optimization or uploads.

**Firewall:** binding to the LAN IP does **not** replace firewall rules. Restrict TCP **8082** to your approved trusted LAN CIDR in Proxmox/VM firewall policy; the IP alone does not reveal your subnet mask. Docker-published ports may bypass ordinary UFW/INPUT rules, so enforce restrictions at Proxmox and/or Docker-aware forwarding rules appropriate to the host's nftables/iptables backend. Verify access from allowed and disallowed networks while preserving existing SSH, Coolify and PixForge access. No public router port forwarding is required. This is HTTP on a trusted LAN; if exposing it beyond that LAN, first design TLS, access controls and rate limits separately.

**Resources:** Compose caps this container at **512 MiB**, one CPU and 128 processes, with a 128 MiB memory reservation and a **256 MiB V8 old-space** limit. The heap limit is not a total-RSS limit. Tmpfs, native allocations and page cache also count against memory. Logs rotate at 5 MiB × two files; application code does not log submitted share URLs. Check host/proxy logs separately and do not enable request-body logging. These are starting limits for the mock app, not a capacity guarantee for Coolify + PixForge on 3 GB. Watch `docker stats`, VM free memory, OOM events and disk usage after deployment.

Builds need more memory/disk than the runtime. The builder uses a 1024 MiB V8 old-space limit **per Node process**; Compose runtime limits do not cap the build, and several build workers may run. On a busy 3 GB VM, avoid concurrent deployments and check `free -h`, `df -h` and `docker system df`. Keep several GB free for image layers and build cache. If builds still exceed available RAM, a future improvement is to build on a **GitHub-hosted runner**, publish a versioned image to GHCR, and configure Coolify to pull that immutable image instead of building locally. That separate workflow would need scoped package-publishing permissions and optional private-registry credentials supplied securely; do not add privileged/self-hosted runners. Never prune unrelated PixForge/Coolify images or volumes blindly.

**Troubleshooting:**

- `address already in use`: inspect `ss -ltnp` and `docker ps --format 'table {{.Names}}\t{{.Ports}}'` on the VM. Resolve the owner of **8082**; do not stop PixForge or repurpose the proxy/dashboard ports.
- `cannot assign requested address`: confirm `10.40.40.242` is assigned to the deployment host. The production Compose file deliberately fails on a machine without that IP; use a separate local override for tests instead of changing the target binding.
- Unhealthy/restarting container: inspect Coolify logs, `/api/health`, and `docker inspect --format '{{json .State.Health}}' <container>`. Check `OOMKilled`, memory limits and disk space. A missing public domain is not an error for this direct LAN-port deployment.
- Page loads without styles/scripts: verify the image was built with `.next/static` copied and the browser can reach its same-origin assets. Existing security headers, CSP, allowlists and SSRF protection remain unchanged.

For direct Compose administration from a checkout **on the target VM** (Coolify users should normally use its Deploy action):

```sh
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 120
docker compose ps
docker compose logs --tail=50 terastream
docker compose exec -T terastream node /app/healthcheck.mjs
```

Do not run a second Compose deployment alongside the Coolify-managed instance on the same port. Deployment checks performed in the development environment are recorded in [Docker validation](docs/coolify-validation.md); they do not establish successful deployment on VM 260.

## What is included

- Next.js App Router, strict TypeScript, Tailwind CSS 4, responsive layout, system color scheme and an in-session theme toggle.
- Accessible URL input, Watch/Download actions, loading and error feedback, sample file metadata, inert player placeholder, separate optional ad placeholder.
- Typed `ProviderAdapter` methods for metadata, streaming URLs, and download URLs. Media links distinguish unavailable, unverified and verified states. The mock returns unavailable links and never makes outbound requests.
- A bounded JSON POST endpoint at `/api/resolve`. Share URLs are sent in the request body, never in query strings. Responses use `Cache-Control: no-store`.
- Exact HTTPS allowlist: `terabox.com` and `www.terabox.com`. Supported paths: `/s/<share-id>` and `/sharing/link?surl=<share-id>`. Tracking parameters, fragments, credentials, nondefault ports, arbitrary subdomains, other mirror domains and unsupported share formats are rejected deliberately.

## Privacy and advertising

The app does not upload, cache, proxy, download to disk, or store user media on its server. The current mock performs **no TeraBox requests**. There is no database, URL history, cookie, local storage, analytics, remote font, tracking pixel or advertising SDK. Submitted URLs exist in transient browser/server memory during a request; avoid logging request bodies in your hosting infrastructure. Hosts may retain IP addresses and request metadata under their own policies.

`NEXT_PUBLIC_ADS_ENABLED=false` is the default. Set it to `true` before building to show only a labeled, first-party ad placeholder. It loads no network or ad script. Advertising lives outside the viewing room and is never presented as a playback/download control. A real ad integration needs a separate review of consent, privacy disclosures and CSP; the current policy blocks third-party resources and frames.

## Provider architecture and security

```
Browser → POST /api/resolve → validateShareUrl → mockProvider
                              (no outbound network, no media URLs)
```

See `src/lib/providers/types.ts` and `mock.ts`. A future provider must use documented, authorized access. There are no hardcoded private APIs, login bypasses, cookie harvesting, paywall workarounds, or access-control circumventions.

`src/lib/server/safe-fetch.ts` supplies a **server-only, metadata-only** transport for future work. It accepts only the same supported share URLs, rejects any nonpublic DNS answer (including mixed public/private answers), pins a validated address to the TLS connection to prevent DNS rebinding, retains certificate checks, rejects **all redirects**, and bounds time and response size. It sends no user cookies or credentials and accepts only HTML/JSON. It is deliberately unused in the mock flow. Never use raw `fetch(userUrl)` or enable automatic redirects in a future adapter.

This helper is a direct Node HTTPS transport, not a proxy-authentication implementation. Environments requiring an egress proxy must supply an equivalent, reviewed proxy-aware transport that enforces the same destination constraints. Use network-level egress restrictions as an additional layer. A real CDN/media destination needs its own explicit policy and review; do not widen the share allowlist to accept arbitrary hosts. The helper buffers bounded **metadata**, never media. Enforce deployment-level request deadlines, rate limits and log redaction before exposing any real upstream integration.

Before enabling live playback or downloads, verify authorized sample shares, URL expiry, redirects and destination safety, MIME type, byte-range support, browser codec support, CORS where relevant, hotlink restrictions, and failure behavior. Record actual live results. Keep unverified links unusable; do not infer playback support from a URL or a successful metadata request. Update CSP's `media-src 'none'` only after review. A future client must also handle verified-link expiry and must never store user media server-side.

## Limitations and contribution

Only the mock workflow is implemented. Password-protected/private shares, folders, real metadata, streaming, downloads, advertising networks and other TeraBox domains are unsupported. The player intentionally contains no video source. Tests cover simulated transport responses; they do not establish TeraBox or CDN compatibility.

Contributions are welcome through pull requests. Keep changes original, preserve privacy and safety boundaries, run `npm run check`, and document observable behavior and limitations. Report security concerns privately using GitHub's vulnerability-reporting feature if available; do not post credentials or private share links in issues.

## License

[MIT](LICENSE), retaining the original copyright notice for Xsat Cloud.
