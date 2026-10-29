/** Production approval list. Evaluated strictly by mediaCsp().
 * Masukkan domain Cloudflare Worker Anda sendiri setelah di-deploy.
 */
export const REVIEWED_MEDIA_ORIGINS: readonly string[] = [
  "https://proxy-terastream.xsatcloud.workers.dev"
];
