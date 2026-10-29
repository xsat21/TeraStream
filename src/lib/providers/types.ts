export interface FileMetadata {
  id: string;
  name: string;
  sizeBytes: number | null;
  mimeType: string;
  source: "mock" | "live";
}

export type MediaLink =
  | { status: "unsupported" | "unauthorized"; reason: string }
  | { status: "unavailable"; reason: string }
  | { status: "unverified"; reason: string }
  | { status: "verified"; url: string; expiresAt: string; verifiedAt: string };

/** Implement only documented, authorized integrations. Never proxy/store media. */
export interface ProviderAdapter {
  readonly id: string;
  getMetadata(shareUrl: URL, signal?: AbortSignal): Promise<FileMetadata>;
  getStreamingUrl(file: FileMetadata, signal?: AbortSignal): Promise<MediaLink>;
  getDownloadUrl(file: FileMetadata, signal?: AbortSignal): Promise<MediaLink>;
}

export interface ResolveResult {
  provider: string;
  file: FileMetadata;
  stream: MediaLink;
  download: MediaLink;
}
