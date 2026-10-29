/** Exact hosts only: adding a host is an explicit security/product decision. */
export const SHARE_HOSTS = ["terabox.com", "www.terabox.com"] as const;

export function validateShareUrl(input: string): URL {
  if (input.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(input)) {
    throw new Error("Enter a valid HTTPS TeraBox public-share URL without spaces.");
  }
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Enter a complete HTTPS TeraBox public-share URL."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash ||
      !SHARE_HOSTS.some((host) => host === url.hostname)) {
    throw new Error("Use https://terabox.com or https://www.terabox.com, without credentials, custom ports, or fragments.");
  }
  const shortShare = /^\/s\/[A-Za-z0-9_-]{1,128}\/?$/.test(url.pathname) && !url.search;
  const longShare = url.pathname === "/sharing/link" &&
    /^[A-Za-z0-9_-]{1,128}$/.test(url.searchParams.get("surl") ?? "") &&
    [...url.searchParams.keys()].length === 1;
  if (!shortShare && !longShare) {
    throw new Error("Use a public-share link with /s/<share-id> or /sharing/link?surl=<share-id>.");
  }
  return url;
}
