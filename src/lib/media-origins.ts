/** Production approval list. Empty until a licensed, authorized CDN is reviewed.
 * Never source this list from env, API responses, submitted URLs or browser props.
 * Test runners replace ONLY this module with their isolated .test fixture origin.
 */
export const REVIEWED_MEDIA_ORIGINS: readonly string[] = [];
