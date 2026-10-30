import "server-only";
import type { ProviderAdapter } from "./types";
import { ProviderError } from "./errors";
import { validateShareUrl } from "../share-url";

/**
 * Parse only supported HTTPS public-share URLs.
 * Parsing does not confer access to file metadata or media.
 */
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
 * Experimental adapter boundary.
 * No verified cookie-free API contract exists, so do not invent an endpoint,
 * impersonate browsers, or expose guessed CDN URLs.
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
      reason: "Anonymous streaming is not verified or configured.",
    };
  },
  async getDownloadUrl() {
    return {
      status: "unverified",
      reason: "Anonymous download is not verified or configured.",
    };
  },
};
