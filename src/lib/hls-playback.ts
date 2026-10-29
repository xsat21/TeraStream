import Hls, { FetchLoader } from "hls.js";
import type { HlsConfig, LoaderContext } from "hls.js";
import { permittedMediaUrl, playbackProblem, type PlaybackSource } from "./media-policy";

/** Every manifest, rendition, fragment and key request uses this guard. */
export function guardedHlsRequest(source: PlaybackSource, context: Pick<LoaderContext, "url">, init: RequestInit): Request {
  if (playbackProblem(source) || !permittedMediaUrl(context.url)) throw new Error("Media request rejected.");
  const headers = new Headers();
  const range = new Headers(init.headers).get("Range");
  if (range && /^bytes=\d+-\d*$/.test(range)) headers.set("Range", range);
  return new Request(context.url, { method: "GET", headers, signal: init.signal,
    credentials: "omit", mode: "cors", redirect: "error", referrerPolicy: "no-referrer", cache: "no-store" });
}

export function hlsPlaybackConfig(source: PlaybackSource): Partial<HlsConfig> {
  return {
    loader: FetchLoader,
    fetchSetup: (context, init: RequestInit) => Promise.resolve().then(() => guardedHlsRequest(source, context, init)),
    debug: false, enableWorker: false, enableInterstitialPlayback: false,
    maxBufferLength: 15, maxMaxBufferLength: 30, maxBufferSize: 16 * 1024 * 1024,
    backBufferLength: 10,
  };
}

export { Hls };
