# Local validation

Validated 2026-10-29 on Node 24.19.0 / npm 11.9.0 in the managed Linux environment.

- Clean `npm ci --no-fund --no-audit` completed from the committed lockfile.
- `npm run check` passed: ESLint with zero warnings, generated Next.js route types and strict TypeScript checks, 77 tests across four suites, and a production Webpack build.
- `npm audit --omit=dev --audit-level=high` reported zero production dependency vulnerabilities at validation time. This is point-in-time registry evidence, not a security guarantee.
- Started the production server and verified HTTP 200 for the landing page, `Referrer-Policy: no-referrer`, and CSP blocking media. A valid share POST returned mock metadata, unavailable media links and `Cache-Control: no-store`. A localhost share POST returned 400.
- A local Chromium smoke run using Playwright 1.64.1 exercised desktop (1440px) and mobile (390px), Watch/Download mock results, unsafe URL rejection, dark/light toggling, no horizontal overflow at the tested mobile width, no video/iframe, no page errors, and zero external browser requests. This browser smoke used temporary tooling outside the repository; only the unit/component tests run in CI.
- The original MIT license is unchanged.

The first browser smoke attempt stopped because its generic alert selector also matched Next.js's route announcer; scoping the selector to form feedback fixed the harness. The initial Turbopack build failed on a managed-environment IPC restriction; the documented Webpack build passed. TypeScript 7 was rejected by the lint parser, so the compatible TypeScript 6 release is pinned. These corrections are included in the final setup.

No live TeraBox metadata, stream, download, CDN, or ad-network integration was tested. Those capabilities remain unavailable. GitHub Actions results must be checked on GitHub after a push; local validation does not establish a CI pass.
