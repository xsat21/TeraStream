# PR #5: live playback verification — blocked, offline scaffold only

Assessment: 2026-10-29. Base `main`: `e31faaa`, including the provider boundary and fixture-tested player. No claim of real TeraBox playback is made.

## Audit and observed access evidence

The official adapter still raises `documentation_unverified`; provider DTO validation quarantines verified links. The workspace player requires official/live provenance and approved, unexpired URLs. `REVIEWED_MEDIA_ORIGINS` is empty; production CSP still blocks media. Native MP4/HLS and hls.js have prior **synthetic-fixture** evidence only. Docker/Coolify, health checks, limits, provider modes, SSRF controls and player implementation are unchanged by this PR.

| Check | Observed result |
| --- | --- |
| Official docs `https://www.terabox.com/integrations/docs/indonesian` | HTTP 403 from CONNECT proxy, `server: envoy`; `curl: (56) CONNECT tunnel failed, response 403` |
| Alternative discovery catalog `https://rapidapi.com/search/terabox` | Same proxy failure. A catalog is not an approved provider or proof of authorization |
| Credential metadata | No configured secret bindings and no exported TERABOX_/TERASTREAM_ variable names during inspection; values never printed |
| Operator-owned test share | Operator supplied a public-share link in reply to the authorized-test request after the initial assessment. Its URL is deliberately not persisted; provider permission/ownership are not independently verified |
| Endpoint contracts / schemas | Not obtained or verified; no endpoint adapter or schema invented |

This is an environment-policy block before reaching either site, not evidence of an upstream API rejection or of the existence/absence of a permitted public-share API. Alternative providers have **not** been validated. No third-party resolver was called. The pre-existing documentation/API-domain draft requirements have not established active connectivity.

## Implemented offline scaffold

Run `npm run probe:terabox` with Node 24. It produces a JSON readiness report and exits **2** for blocked prerequisites. This is deliberately not a success exit and never performs network access. The CLI does not load `.env.local`; use securely injected process environment values. It is not a public Next.js route and is excluded from the Docker build context.

Optional environment inputs:

- `TERASTREAM_PROBE_SHARE_URL`: operator-owned, authorized public-share URL matching the existing allowlist. Treat this URL as sensitive; do not commit it or place it in shell history, CI output or chat logs.
- `TERASTREAM_PROBE_OWNER_CONFIRMED=true`: operator assertion of permission to test. This does not establish API permission, and cannot bypass the reviewed-contract requirement.

No credential names are guessed or supported until an API contract specifies the actual authorization mechanism. Endpoint/contract overrides from environment variables are ignored. `REVIEWED_PROBE_CONTRACTS` remains empty in code. Even an authorized share and credentials cannot enable a network probe while this registry is empty. The scaffold returns booleans/fixed codes only; never URLs, tokens or raw provider errors. There is no metadata request implementation in this PR.

## Browser Network evidence

**Not captured / not run.** There is no authorized live source or verified CDN origin. No HAR, screenshot, network timing, media request or playback result is fabricated. Re-running the existing synthetic fixture harness would not answer this task's real-CDN question.

| Live requirement | Status |
| --- | --- |
| Official/alternative endpoint, auth, public-share permission, response schema | Blocked: documentation/contract |
| Operator test share / issued credential scopes | Share supplied for requested testing; credentials/scopes still unavailable |
| Actual filename/file ID/MIME/expiry/HTTPS/CDN URL | Not probed |
| Browser CORS, MP4 range/seeking, HLS playlists/segments | Not run |
| Cookies/referer/hotlink requirements and URL expiry | Unknown; no cookies or spoofed referer attempted |
| Player promotion / CSP CDN allowlist | Not permitted by current evidence; unchanged |

## Resume procedure and evidence format

1. Apply approved environment networking for the documentation destination and obtain a publicly documented, authorized contract. For alternatives, verify operator permission to resolve TeraBox shares, provenance, terms, endpoint origin, authentication/scopes and schemas; a marketing claim or catalog listing is insufficient. Do not use `ndus`, private APIs or access-control bypasses.
2. Supply legitimately issued credentials securely through environment settings after the verified contract defines names/destinations, plus an operator-owned share and permission confirmation. Never embed tokens in images, build args, source or public output.
3. Implement a reviewed metadata-only transport/strict schema for that exact contract, preserving TLS, SSRF pinning, bounded responses/timeouts and redirect/secret rules. Do not request or forward video bytes through the TeraStream backend. Account-file downloads are not presumed applicable to public shares.
4. Review actual HTTPS media/CDN origins, MIME/codecs and expiry without persisting signed URLs. Only then create an isolated browser policy, separate from production, with exact approved origins. All manifests, segments/keys, redirects and credentials must be covered by permission and policy.
5. Capture browser evidence locally with timestamp, browser version, media format, redacted origin/request role, status/MIME/range/CORS results, playback progress, seek outcome and cookie/referer requirements. Strip query strings, paths containing share IDs, Authorization/Cookie/Set-Cookie and token-bearing headers. Do not commit raw HAR files or media bodies; retain only reviewed redacted summaries. Tests must not send cookies or bypass CORS/hotlink controls. Stop if authorization cannot safely be delivered to the browser.
6. Promote integration only after those tests pass. Keep production allowlist closed meanwhile. No proxy/Cloudflare Worker or server-side storage is proposed or implemented. Never merge automatically.

## Validation scope

Unit tests cover blocked prerequisites, existing URL safety, permission confirmation, ignored endpoint/token injection and CLI redaction/non-success exit. Existing provider/player/security tests and production build are required; these remain offline/synthetic checks, not proof of TeraBox compatibility.

Local result: `npm run check` passed lint, strict typecheck, **139 tests across nine suites** and production standalone build; `docker compose config --quiet` passed. Manual CLI invocation returned the documented redacted offline report with exit 2. No dependencies, production policies, deployment settings or live provider implementation changed. Browser Network live evidence remains **not run**.

Operator update: a share was supplied during this task. It was not opened through undocumented APIs, persisted in the repository, or included in CLI output. The manual CLI example above used no process-environment share, so its missing-share result is not a claim that no link was provided in chat. The documentation/credential blockers remain; live Network tests are still not run.
