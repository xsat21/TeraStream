import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { probeReadiness, REVIEWED_PROBE_CONTRACTS } from "../src/lib/probe/readiness";

describe("offline live-probe readiness (no API or media requests)", () => {
  it("never claims successful metadata/browser evidence without a reviewed contract", () => {
    const report = probeReadiness({ TERASTREAM_PROBE_SHARE_URL: "https://terabox.com/s/operator-owned", TERASTREAM_PROBE_OWNER_CONFIRMED: "true" });
    expect(REVIEWED_PROBE_CONTRACTS).toEqual([]);
    expect(report.status).toBe("blocked");
    expect(report.blockers).toEqual(["no_reviewed_api_contract"]);
    expect(report.metadata).toBe("not_run");
    expect(report.browserNetwork).toBe("not_run");
    expect(report.playback).toBe("not_verified");
  });
  it.each([undefined, "https://localhost/s/x", "https://127.0.0.1/s/x", "https://[::1]/s/x", "https://evil.test/s/x"])("rejects absent/unsafe operator inputs without reflecting them", (share) => {
    expect(probeReadiness({ TERASTREAM_PROBE_SHARE_URL: share }).prerequisites.shareValid).toBe(false);
  });
  it("requires explicit operator confirmation, not mere possession of a public link", () => {
    expect(probeReadiness({ TERASTREAM_PROBE_SHARE_URL: "https://terabox.com/s/test", TERASTREAM_PROBE_OWNER_CONFIRMED: "yes" }).blockers).toContain("operator_permission_not_confirmed");
  });
  it("ignores injected endpoints/contracts/tokens and emits no share identifiers", () => {
    const input = { TERASTREAM_PROBE_SHARE_URL: "https://terabox.com/s/private-identifier", TERASTREAM_PROBE_OWNER_CONFIRMED: "true", TERASTREAM_PROBE_ENDPOINT: "https://169.254.169.254/", TERABOX_TOKEN: "secret-token", TERASTREAM_PROBE_CONTRACT: "trusted" };
    const text = JSON.stringify(probeReadiness(input));
    expect(text).not.toMatch(/private-identifier|secret-token|169\.254/);
    expect(probeReadiness(input).status).toBe("blocked");
  });
  it("CLI exits blocked, produces only redacted offline evidence and needs no fetch", () => {
    // Restrict Node filesystem permissions; the CLI has no network implementation.
    const result = spawnSync(process.execPath, ["--permission", "--allow-fs-read=" + process.cwd(), "scripts/terabox-live-probe.mjs"], {
      encoding: "utf8", env: { ...process.env, TERASTREAM_PROBE_SHARE_URL: "https://terabox.com/s/cli-private-id", TERABOX_TOKEN: "secret-cli-token" },
    });
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout).mode).toBe("offline-readiness-only");
    expect(result.stdout + result.stderr).not.toMatch(/cli-private-id|secret-cli-token/);
  });
});
