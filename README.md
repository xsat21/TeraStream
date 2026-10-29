# TeraStream

An original, MIT-licensed, privacy-conscious foundation for a TeraBox public-share viewer, video player, and downloader. Independent from and not endorsed by TeraBox.

**Status: mock provider only.** The interface shows an explicitly labeled sample file for valid share links. It does not resolve real file information, play TeraBox videos, or download files. No live streaming tests have been performed; direct streaming is **not verified**. Watch and Download explore the intended workflow and explain the current limitation.

## Develop locally

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
npm start              # production server, after building
# Or run all checks with npm run check
```

CI runs a frozen `npm ci` followed by `npm run check` on pull requests and pushes to `main`. Package versions are pinned and the lockfile is committed. See [version verification](docs/dependencies.md) for registry evidence and compatibility choices.

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
