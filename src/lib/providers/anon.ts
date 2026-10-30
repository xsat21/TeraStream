import "server-only";
import type { ProviderAdapter } from "./types";
import { ProviderError } from "./errors";
import { validateShareUrl } from "../share-url";

/** Validate and parse only HTTPS public-share links supported by TeraStream. */
export function extractSurl(input: string): string {
  const url = validateShareUrl(input);
  const pathMatch = /^\/s\/([A-Za-z0-9_-]{1,128})\/?$/.exec(url.pathname);
  const surl = pathMatch?.[1] ??
    (url.pathname === "/sharing/link" ? url.searchParams.get("surl") : null);

  if (!surl || !/^[A-Za-z0-9_-]{1,128}$/.test(surl)) {
    throw new Error("Invalid TeraBox public-share identifier");
  }
  return surl;
}

/**
 * A typed boundary for a future anonymous integration.
 * The previously constructed URL was not a valid endpoint and the returned
 * fields did not implement the ProviderAdapter contract. Until an upstream
 * public-access contract is verified, this provider fails closed.
 */
export const anonProvider: ProviderAdapter = {
  id: "anon",
  async getMetadata(shareUrl) {
    extractSurl(shareUrl.href);
    throw new ProviderError("documentation_unverified");
  },
  async getStreamingUrl() {
    return {
      status: "unverified",
      reason: "Anonymous streaming has not been verified.",
    };
  },
  async getDownloadUrl() {
    return {
      status: "unverified",
      reason: "Anonymous downloads have not been verified.",
    };
  },
};
