export type ProviderFailure = "configuration" | "documentation_unverified" | "unauthorized" | "authorization_expired" | "unsupported" | "unavailable" | "invalid_response";

const failures: Record<ProviderFailure, { status: number; message: string }> = {
  configuration: { status: 503, message: "Provider configuration is invalid. Set TERASTREAM_PROVIDER to mock or official." },
  documentation_unverified: { status: 503, message: "Official provider is not configured: official API contracts and authorized access have not been verified. Live metadata, playback and downloads are disabled. Ask the administrator to review the integration status." },
  unauthorized: { status: 401, message: "The provider has not authorized access to this content." },
  authorization_expired: { status: 401, message: "Provider authorization has expired. The administrator must renew it using the official authorization workflow." },
  unsupported: { status: 422, message: "This share or file type is not supported by the authorized provider integration." },
  unavailable: { status: 502, message: "The provider is unavailable. Please try again." },
  invalid_response: { status: 502, message: "The provider returned an invalid or unverified response. No media was enabled." },
};

/** Fixed public messages only; never serialize upstream errors, URLs or tokens. */
export class ProviderError extends Error {
  readonly httpStatus: number;
  constructor(readonly code: ProviderFailure) {
    super(failures[code].message);
    this.httpStatus = failures[code].status;
  }
}
