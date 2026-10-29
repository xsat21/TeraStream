import { validateShareUrl } from "../share-url";
import type { ProviderAdapter } from "./types";

/** A fixed fixture, never a claim about the submitted share's real contents. */
export const mockProvider: ProviderAdapter = {
  id: "mock",
  async getMetadata(shareUrl) {
    validateShareUrl(shareUrl.href);
    return { id: "demo-file", name: "Sample film.mp4 (demo)", sizeBytes: 134217728, mimeType: "video/mp4", source: "mock" };
  },
  async getStreamingUrl() {
    return { status: "unavailable", reason: "Demo only. No live TeraBox streaming URL has been obtained or verified." };
  },
  async getDownloadUrl() {
    return { status: "unavailable", reason: "Demo only. No real download URL is available." };
  },
};
