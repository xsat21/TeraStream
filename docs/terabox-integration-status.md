# Authorized TeraBox integration status

Assessment date: 2026-10-29. Base: `origin/main` at `0789707` (includes Coolify deployment). No dependency changes, private APIs, session cookies, upstream media requests, credential persistence or media buffering were introduced.

## Official documentation evidence

Requested directly: https://www.terabox.com/integrations/docs/indonesian

The request failed with HTTP 403 at the managed environment's CONNECT proxy (`server: envoy`, `CONNECT tunnel failed, response 403`). Runtime policy is enforced and does not currently permit `www.terabox.com`. This is an environment access blocker, not evidence that TeraBox rejects the API or that public shares are unsupported. The documentation body was not obtained. No alternate/private endpoint or proxy bypass was attempted.

An additive `www.terabox.com` network requirement was saved in the environment draft, preserving the existing `api.github.com` requirement. Saving does not apply or publish it. Review/save the environment settings and publish as required by the platform; recheck actual documentation access before implementing API calls. Further API/CDN domains must be identified from verified official contracts before requesting access to them.

No configured TeraBox credential bindings or exported TERABOX_/TERASTREAM_ variable names were found during inspection. Values were not printed. No authorized real test-share fixtures were provided. Credentials alone would not unblock this implementation before documentation review.

## Capability matrix

| Capability | Implemented/tested | Live status |
| --- | --- | --- |
| Runtime mode selection | mock default; official/invalid never fall back to demo | Local mode/error tests only |
| Official adapter | Server-only `ProviderAdapter` boundary; metadata raises a safe configuration error; media links unverified | No API client implemented |
| Metadata | Internal DTO validation and mock fixture | Real metadata blocked by documentation and authorized access |
| Folder/multi-file shares | Safe unsupported error category available; no list implementation | Official support/contract unknown |
| Auth / expired authorization | Fixed public error categories; tested using injected internal errors | OAuth/token contract and renewal unverified; no callback or token storage |
| MP4 / HLS | Media remains inert; verified-link claims quarantined | No authorized source, CDN policy, expiry or live browser test; not implemented |
| Public-share download | Clear unverified message; no buffering or links | Applicability/permission unknown; not implemented |
| SSRF defense | Existing exact hosts, public DNS validation/pinning, no redirects, size/deadline limits retained | Mocked transport tests; not a live upstream test |
| Privacy / errors | No sample in official response; no fallback; no echoed upstream errors; no URL logging in tested paths | No live credential or upstream error handling exercised |

**Unsupported by the documented API:** no conclusion can be made while documentation is inaccessible. A disabled feature in this application does not prove the official API lacks it.

## Endpoint review still required

The task mentions `/openapi/share/list`, `/openapi/share/mediameta` and `/openapi/share/streaming`. These are **unverified candidates supplied by the task**, not endpoint contracts verified by this implementation. No request methods, authentication headers, query parameters, response fixtures or OAuth routes have been invented for them.

Before implementing any candidate, record its official documentation reference, method/origin, authorization scopes and consent, required parameters, error/expiry semantics, response schema, limits, and whether third-party/public-share files are actually permitted. Resolve share/file IDs, folders and supported media from the documented contract. Account-file download permission must never be treated as permission to download arbitrary shares.

## Remaining work to enable real functionality

1. Restore official documentation access and review authorization plus each permitted share operation. Specify strict real API schemas only from documented evidence.
2. Obtain legitimately issued credentials with the necessary scopes and owner-approved test shares through secure environment settings. Never use captured cookies or place credential values in chat, browser bundles, images or build args.
3. Implement the documented auth flow securely. OAuth, if required, needs state validation, appropriate PKCE and a server-side token store; there is no public callback in this patch.
4. Add a separate API transport policy derived from verified origins. Do not reuse the current share-page helper for arbitrary API/CDN URLs or allow automatic redirects. Keep public-address pinning, TLS, limits and sensitive-error redaction.
5. Implement real file/folder metadata mapping and tests using actual **documented**, sanitized API fixtures. Current tests use internal DTOs/error simulations and make no claim to API compatibility.
6. Verify authorized MP4/HLS URLs, origins, formats, expiry and browser playback. If playback credentials cannot safely be given to the browser, leave it disabled; do not add a media proxy or leak tokens. Only then design the narrowly scoped CSP/media-policy change and an actual player.
7. Enable direct downloads only if official public-share permission is established, handling expiry and filenames without buffering/storing media. Do not send authorization to unrelated origins.
8. Run authorized live integration tests and record their exact scope/results before promoting the provider or making streaming/download claims. Mock remains default until this passes.

## Configuration

- `TERASTREAM_PROVIDER`: server-only runtime setting; `mock` default, `official` blocked, any other value returns a safe 503. Compose forwards only this non-secret setting. No TeraBox credential names are claimed to be supported.
- `NEXT_PUBLIC_ADS_ENABLED`: existing non-secret build-time ad-placeholder flag, false by default.
- `NEXT_TELEMETRY_DISABLED`: existing build/runtime telemetry flag, set to 1.

Deployment hardening, port binding, Node 24 and standalone output remain intact. The homepage is now dynamically rendered so changing runtime provider mode is reflected without rebuilding browser assets. No secret is passed to the client; only a validated mode enum is serialized.

## Local validation results

- Clean `npm ci`, lint, typecheck, **100 tests across five suites**, production standalone build and `docker compose config --quiet` passed.
- Docker image built with the existing multi-stage Dockerfile; the managed environment's CA was passed through its existing temporary BuildKit secret. No dependency versions, lockfile, Dockerfile, CSP, URL allowlist, SSRF implementation or MIT license changed.
- The same production image was started twice with runtime-only mode settings, using temporary loopback ports 18083/18084 and all existing Compose security/resource controls. Both containers reached application **healthy**.
- In mock mode, the page showed the demo badge and the API returned mock metadata/unavailable media. In official mode, the page showed the configuration blocker and the API returned 503 `documentation_unverified`, with no file metadata. A client-supplied `provider: mock` field did not override official mode.
- Both modes retained `Cache-Control: no-store` on resolution, the existing media-blocking CSP and working health endpoint. A unique submitted share marker did not appear in either container's application logs. Test containers/network were removed afterward.
- Internal test simulations cover unsupported/unauthorized/expired errors, no network/mock fallback, upstream-error redaction, malformed DTOs, malicious filenames, claimed verified-link rejection in API/UI, public-address checks and DNS pinning, unsafe redirects, response-size limits and DNS/request deadlines. These are **not mocked documented TeraBox responses**, and are not evidence of real API or streaming compatibility.

Not run: live metadata, OAuth, credential expiry/refresh, CDN URLs, native MP4/HLS playback, or public-share downloads. They remain blocked or unimplemented as detailed above; no authorized live test inputs exist. GitHub CI status is separate from these local results.
