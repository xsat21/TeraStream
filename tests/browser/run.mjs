// Optional real-browser test: generated project-owned bytes, no third-party CDN.
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const temp = await mkdtemp(path.join(tmpdir(), "terastream-video-"));
let server, browser;
try {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=24", "-t", "4", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-g", "24", "-keyint_min", "24", "-sc_threshold", "0", "-movflags", "+faststart", path.join(temp, "clip.mp4")]);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", path.join(temp, "clip.mp4"), "-c", "copy", "-hls_time", "1", "-hls_playlist_type", "vod", "-hls_segment_filename", path.join(temp, "segment-%02d.ts"), path.join(temp, "playlist.m3u8")]);
  server = await createServer({
    configFile: false, root: path.join(repo, "tests/browser"),
    // Replace the approval list only inside this test bundle, not application code.
    plugins: [{ name: "isolated-fixture-policy", enforce: "pre", resolveId(id, importer) {
      if (id === "./media-origins.ts" && importer?.endsWith("/src/lib/media-policy.ts")) return path.join(repo, "tests/browser/reviewed-origins.ts");
    } }],
    resolve: { alias: { "@": path.join(repo, "src") } },
    server: { host: "127.0.0.1", port: 0, fs: { allow: [repo] }, headers: {
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://media.terastream.test; media-src blob: https://media.terastream.test; worker-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'self'",
    } },
  });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: process.env.PLAYWRIGHT_DISABLE_SANDBOX === "1" ? ["--no-sandbox"] : [] });
  for (const { format, forceHlsJs } of [{ format: "mp4", forceHlsJs: false }, { format: "hls", forceHlsJs: false }, { format: "hls", forceHlsJs: true }]) {
    const page = await browser.newPage();
    if (forceHlsJs) await page.addInitScript(() => {
      const original = HTMLMediaElement.prototype.canPlayType;
      HTMLMediaElement.prototype.canPlayType = function(type) {
        return type === "application/vnd.apple.mpegurl" ? "" : original.call(this, type);
      };
    });
    const problems = [], requests = [];
    page.on("pageerror", error => problems.push(error.message));
    await page.route("**/*", async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === base) return route.continue();
      if (url.origin !== "https://media.terastream.test" || !/^\/(clip\.mp4|playlist\.m3u8|segment-\d+\.ts)$/.test(url.pathname)) {
        problems.push("Unexpected external request"); return route.abort();
      }
      expect(req.headers()["authorization"]).toBeUndefined();
      expect(req.headers()["cookie"]).toBeUndefined();
      requests.push(url.pathname);
      const body = await readFile(path.join(temp, url.pathname.slice(1)));
      const contentType = url.pathname.endsWith(".mp4") ? "video/mp4" : url.pathname.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t";
      const headers = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS", "Access-Control-Allow-Headers": "Range", "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers()["range"] ?? "");
      if (range) {
        const start = +range[1], end = range[2] ? Math.min(+range[2], body.length-1) : body.length-1;
        return route.fulfill({ status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${body.length}` }, contentType, body: body.subarray(start, end+1) });
      }
      return route.fulfill({ status: 200, headers, contentType, body });
    });
    await page.goto(`${base}/?format=${format}`);
    const video = page.locator("video");
    await expect(video).toBeVisible();
    await expect.poll(() => video.evaluate(v => v.readyState), { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
    await video.evaluate(v => v.play());
    await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThan(0.2);
    await video.evaluate(v => { v.pause(); v.volume = 0.25; v.currentTime = 2; });
    await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThanOrEqual(1.9);
    expect(await video.evaluate(v => v.controls && v.paused && v.volume === 0.25)).toBe(true);
    if (format === "hls") {
      expect(requests).toContain("/playlist.m3u8");
      expect(requests.some(p => p.endsWith(".ts"))).toBe(true);
      if (forceHlsJs) expect(await video.evaluate(v => v.src.startsWith("blob:"))).toBe(true);
    }
    await video.evaluate(v => v.requestFullscreen());
    expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await page.evaluate(() => document.exitFullscreen());
    expect(problems).toEqual([]);
    const engine = await video.evaluate(v => v.src.startsWith("blob:") ? "hls.js/MSE" : "native");
    console.log(`${format} (${engine}): decoded synthetic frames, play/pause, volume, seek, fullscreen and scoped media requests passed.`);
    await page.close();
  }
} finally {
  await browser?.close();
  await server?.close();
  await rm(temp, { recursive: true, force: true });
}
