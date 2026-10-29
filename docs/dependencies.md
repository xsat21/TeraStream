# Dependency selection

Registry checks performed 2026-10-29 using `npm view`, with the results tested in the local build. Exact direct dependencies and transitive resolutions are recorded in `package.json` and `package-lock.json`.

| Package | Selected | Registry evidence / compatibility |
| --- | --- | --- |
| Next.js / eslint-config-next | 16.4.3 | `next@latest`; Node >=20.9; React ^19 supported |
| React / React DOM | 19.3.1 | `react@latest`; satisfies Next.js peers |
| Tailwind CSS / PostCSS plugin | 4.3.3 | `tailwindcss@latest`, `@tailwindcss/postcss@latest`; CSS-first PostCSS setup |
| TypeScript | 6.0.3 | Latest stable 6.x. Next's typescript-eslint requires >=4.8.4 <6.1; TypeScript 7.0.2 was tried and rejected by the lint parser |
| ESLint | 9.39.5 | Compatible stable 9.x. Latest ESLint 10.13.0 is excluded by eslint-plugin-react's declared peer range (^9.7 maximum major); npm marks ESLint 9 deprecated |
| Vitest | 5.0.5 | `vitest@latest`; supports Node ^24.0 |
| jsdom | 30.1.3 | `jsdom@latest`; Node ^24.15 supported |
| Testing Library React | 16.3.3 | `@testing-library/react@latest`; supports React 19 |
| ipaddr.js | 2.5.0 | `ipaddr.js@latest`; address-range classification |

Reproduce the metadata checks:

```sh
npm view next@latest version engines peerDependencies --json
npm view react@latest version --json
npm view tailwindcss@latest version --json
npm view @tailwindcss/postcss@latest version peerDependencies --json
npm view typescript-eslint@latest peerDependencies --json
npm view eslint-plugin-react@latest peerDependencies --json
npm view vitest@latest version engines --json
npm view jsdom@latest version engines --json
```

Registry source: `https://registry.npmjs.org/`. Stable tags can change; update related packages together and repeat all checks. Avoid forcing incompatible peer dependencies. This project uses the compatible TypeScript 6 / ESLint 9 combination rather than suppressing parser failures or forcing the latest major versions.

Next.js uses its supported `--webpack` flag for development and production builds. Turbopack's CSS worker could not bind its IPC port in the managed environment; the same app builds successfully using Webpack. No feature requires Turbopack. GitHub Actions checkout/setup-node use v6 tag SHAs verified through `git ls-remote` on their official repositories.
