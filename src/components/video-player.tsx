"use client";

import { useEffect, useRef, useState } from "react";
import { playbackProblem, type PlaybackSource } from "@/lib/media-policy";

export function VideoPlayer({ source, title = "Video playback" }: { source: PlaybackSource; title?: string }) {
  // Key by every authorization field to avoid displaying the old source while a
  // changed/expired source is being validated. Invalid input never creates video.
  const problem = playbackProblem(source);
  if (problem) return <p role="alert" className="feedback error">{problem}</p>;
  return <PlaybackSession key={JSON.stringify(source)} source={source} title={title} />;
}

function PlaybackSession({ source, title }: { source: PlaybackSource; title: string }) {
  const { url, format, verifiedAt, expiresAt } = source;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: true, error: null });

  useEffect(() => {
    const source: PlaybackSource = { status: "verified", url, format, verifiedAt, expiresAt };
    const video = videoRef.current;
    if (!video) return;
    const lifecycle = new AbortController();
    let disposed = false;
    let destroyHls: (() => void) | undefined;
    let expiryTimer: ReturnType<typeof setTimeout>;
    let stallTimer: ReturnType<typeof setTimeout>;
    const unload = () => {
      destroyHls?.();
      destroyHls = undefined;
      video.pause();
      video.removeAttribute("src");
      video.load(); // cancels native downloads and releases the previous buffer
    };
    const fail = (message: string) => {
      if (disposed) return;
      disposed = true;
      lifecycle.abort();
      clearTimeout(expiryTimer);
      clearTimeout(stallTimer);
      unload();
      setState({ loading: false, error: message });
    };
    const expire = () => {
      const remaining = Date.parse(source.expiresAt) - Date.now();
      if (remaining <= 0) fail("This video link has expired. Request a newly verified link.");
      else expiryTimer = setTimeout(expire, Math.min(remaining, 60_000));
    };
    const checkExpiry = () => {
      if (Date.now() >= Date.parse(source.expiresAt)) fail("This video link has expired. Request a newly verified link.");
    };
    const stall = () => { fail("Video loading timed out. Check the network or request a fresh verified link."); };
    const ready = () => { if (!disposed) { clearTimeout(stallTimer); setState({ loading: false, error: null }); } };
    const waiting = () => { if (!disposed) {
      clearTimeout(stallTimer); stallTimer = setTimeout(stall, 30_000);
      setState({ loading: true, error: null });
    } };
    video.addEventListener("loadeddata", ready, { signal: lifecycle.signal });
    video.addEventListener("canplay", ready, { signal: lifecycle.signal });
    video.addEventListener("playing", ready, { signal: lifecycle.signal });
    video.addEventListener("waiting", waiting, { signal: lifecycle.signal });
    video.addEventListener("error", () => fail("Video playback failed. The format, network or access policy may be unsupported."), { signal: lifecycle.signal });
    video.addEventListener("play", checkExpiry, { signal: lifecycle.signal });
    video.addEventListener("timeupdate", checkExpiry, { signal: lifecycle.signal });
    document.addEventListener("visibilitychange", checkExpiry, { signal: lifecycle.signal });
    stallTimer = setTimeout(stall, 30_000);
    expire();

    async function attach() {
      try {
        if (source.format === "mp4") {
          if (!video!.canPlayType("video/mp4")) { fail("This browser does not support MP4 playback."); return; }
          video!.src = source.url;
          video!.load();
        } else if (video!.canPlayType("application/vnd.apple.mpegurl")) {
          video!.src = source.url;
          video!.load();
        } else {
          const { Hls, hlsPlaybackConfig } = await import("@/lib/hls-playback");
          if (disposed) return;
          if (!Hls.isSupported()) { fail("This browser does not support HLS playback."); return; }
          const hls = new Hls(hlsPlaybackConfig(source));
          const onError = (_event: unknown, data: { fatal: boolean }) => {
            if (data.fatal) fail("HLS playback failed. Request a fresh verified link or check format and CORS support.");
          };
          destroyHls = () => { hls.off(Hls.Events.ERROR, onError); hls.stopLoad(); hls.destroy(); };
          hls.on(Hls.Events.ERROR, onError);
          hls.attachMedia(video!);
          hls.loadSource(source.url);
        }
      } catch { fail("Unable to initialize video playback. No media was enabled."); }
    }
    if (!disposed) void attach();
    return () => {
      disposed = true;
      clearTimeout(expiryTimer);
      clearTimeout(stallTimer);
      lifecycle.abort();
      unload();
    };
  }, [url, format, verifiedAt, expiresAt]);

  return <div className="video-player" aria-label={title}>
    {!state.error && <video ref={videoRef} aria-label={title} controls playsInline preload="metadata" crossOrigin="anonymous" disablePictureInPicture>
      Your browser does not support HTML5 video.
    </video>}
    {state.loading && <p role="status">Loading video…</p>}
    {state.error && <p role="alert" className="feedback error">{state.error}</p>}
  </div>;
}
