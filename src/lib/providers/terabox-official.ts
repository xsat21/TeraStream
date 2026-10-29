import "server-only";
import type { ProviderAdapter } from "./types";
import { ProviderError } from "./errors";
import { validateShareUrl } from "../share-url";

/**
 * Fail-closed adapter boundary, NOT an implemented TeraBox API client.
 * Documentation is blocked in this environment and no issued credentials/test
 * shares are available. Do not guess endpoints, schemas, OAuth or CDN policies.
 * See docs/terabox-integration-status.md before implementing any network access.
 */
export const teraboxOfficialProvider: ProviderAdapter = {
  id: "official",
  async getMetadata(shareUrl) {
    validateShareUrl(shareUrl.href);
    throw new ProviderError("documentation_unverified");
  },
  async getStreamingUrl() {
    return { status: "unverified", reason: "Authorized streaming contracts, browser-safe origins and playback have not been verified." };
  },
  async getDownloadUrl() {
    return { status: "unverified", reason: "Authorized public-share download support has not been verified." };
  },
};
