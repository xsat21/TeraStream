// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VideoPlayer } from "../src/components/video-player";
import { fixtureSource } from "./fixtures/playback";
import type { PlaybackSource } from "../src/lib/media-policy";

vi.mock("../src/lib/media-origins", () => ({ REVIEWED_MEDIA_ORIGINS: ["https://media.terastream.test"] }));
const fake = vi.hoisted(() => ({ supported: true, instances: [] as Array<{
  on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn>; stopLoad: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn>; loadSource: ReturnType<typeof vi.fn>;
}> }));
vi.mock("hls.js", () => ({ FetchLoader: class {}, default: class {
  static isSupported() { return fake.supported; }
  static Events = { ERROR: "hlsError" };
  on = vi.fn(); off = vi.fn(); stopLoad = vi.fn(); destroy = vi.fn(); loadSource = vi.fn(); attachMedia = vi.fn();
  constructor() { fake.instances.push(this); }
} }));

beforeEach(() => {
  fake.supported = true; fake.instances.length = 0;
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockImplementation((type) => type === "video/mp4" ? "probably" : "");
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("video player with licensed synthetic fixture contract", () => {
  it("uses native MP4 controls for play/pause, volume, seek and fullscreen, with no autoplay", () => {
    const { container } = render(<VideoPlayer source={fixtureSource()} />);
    const video = container.querySelector("video")!;
    expect(video.src).toBe(fixtureSource().url);
    expect(video.controls).toBe(true); expect(video.autoplay).toBe(false);
    expect(video.crossOrigin).toBe("anonymous"); expect(video.preload).toBe("metadata");
    expect(screen.getByRole("status").textContent).toContain("Loading");
    fireEvent.canPlay(video); expect(screen.queryByRole("status")).toBeNull();
    fireEvent.waiting(video); expect(screen.getByRole("status")).toBeDefined();
    expect(fake.instances).toHaveLength(0);
  });
  it("prefers native HLS when the browser supports it", () => {
    vi.mocked(HTMLMediaElement.prototype.canPlayType).mockReturnValue("probably");
    const { container } = render(<VideoPlayer source={fixtureSource("hls")} />);
    expect(container.querySelector("video")!.src).toContain("playlist.m3u8");
    expect(fake.instances).toHaveLength(0);
  });
  it("uses hls.js fallback and destroys HLS, cancels loading and removes listeners on unmount", async () => {
    const { unmount } = render(<VideoPlayer source={fixtureSource("hls")} />);
    await waitFor(() => expect(fake.instances).toHaveLength(1));
    const instance = fake.instances[0];
    expect(instance.loadSource).toHaveBeenCalledWith(fixtureSource("hls").url);
    unmount();
    expect(instance.off).toHaveBeenCalled(); expect(instance.stopLoad).toHaveBeenCalled(); expect(instance.destroy).toHaveBeenCalledOnce();
  });
  it("cleans up native source/events and HLS when source changes", async () => {
    const { container, rerender } = render(<VideoPlayer source={fixtureSource("hls")} />);
    await waitFor(() => expect(fake.instances).toHaveLength(1));
    const oldVideo = container.querySelector("video")!;
    rerender(<VideoPlayer source={fixtureSource("mp4")} />);
    expect(fake.instances[0].destroy).toHaveBeenCalledOnce();
    expect(oldVideo.hasAttribute("src")).toBe(false);
    fireEvent.error(oldVideo);
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("handles MP4 and HLS unsupported browsers without a playable src", async () => {
    vi.mocked(HTMLMediaElement.prototype.canPlayType).mockReturnValue("");
    fake.supported = false;
    const { rerender, container } = render(<VideoPlayer source={fixtureSource("mp4")} />);
    expect(screen.getByRole("alert").textContent).toContain("does not support MP4");
    rerender(<VideoPlayer source={fixtureSource("hls")} />);
    expect((await screen.findByRole("alert")).textContent).toContain("does not support HLS");
    expect(container.querySelector("video")).toBeNull();
  });
  it("rejects invalid, unverified, unsupported-format and already expired sources without creating video", () => {
    const source = fixtureSource();
    const { container, rerender } = render(<VideoPlayer source={{ ...source, url: "https://evil.test/a?token=secret" }} />);
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByRole("alert").textContent).not.toContain("secret");
    rerender(<VideoPlayer source={{ ...source, expiresAt: new Date(Date.now()-1000).toISOString() }} />);
    expect(screen.getByRole("alert").textContent).toContain("expired");
    expect(container.querySelector("video")).toBeNull();
    rerender(<VideoPlayer source={{ ...source, status: "unverified" } as unknown as PlaybackSource} />);
    expect(container.querySelector("video")).toBeNull();
    rerender(<VideoPlayer source={{ ...source, format: "mkv" } as unknown as PlaybackSource} />);
    expect(screen.getByRole("alert").textContent).toContain("unsupported");
    expect(container.querySelector("video")).toBeNull();
  });
  it("does not recreate HLS for an equivalent source object or initialize it after unmount", async () => {
    const source = fixtureSource("hls");
    const { rerender, unmount } = render(<VideoPlayer source={source} />);
    await waitFor(() => expect(fake.instances).toHaveLength(1));
    rerender(<VideoPlayer source={{ ...source }} />);
    expect(fake.instances).toHaveLength(1);
    expect(fake.instances[0].destroy).not.toHaveBeenCalled();
    unmount();
    fake.instances.length = 0;
    const second = render(<VideoPlayer source={source} />);
    second.unmount();
    await act(async () => {});
    expect(fake.instances).toHaveLength(0);
  });
  it("fails safely when loading stalls and cancels timers on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(<VideoPlayer source={fixtureSource()} />);
    act(() => { vi.advanceTimersByTime(30_001); });
    expect(screen.getByRole("alert").textContent).toContain("timed out");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("stops playback and unloads on expiry, even while already playing", () => {
    vi.useFakeTimers();
    const source = { ...fixtureSource(), expiresAt: new Date(Date.now()+1000).toISOString() };
    const { container } = render(<VideoPlayer source={source} />);
    const video = container.querySelector("video")!;
    act(() => { vi.advanceTimersByTime(1001); });
    expect(screen.getByRole("alert").textContent).toContain("expired");
    expect(video.hasAttribute("src")).toBe(false);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
  it("shows sanitized native and fatal HLS errors without logging source URLs", async () => {
    const log = vi.spyOn(console, "error");
    const { container, rerender } = render(<VideoPlayer source={fixtureSource()} />);
    fireEvent.error(container.querySelector("video")!);
    expect(screen.getByRole("alert").textContent).toContain("Video playback failed");
    rerender(<VideoPlayer source={fixtureSource("hls")} />);
    await waitFor(() => expect(fake.instances).toHaveLength(1));
    const callback = fake.instances[0].on.mock.calls[0][1];
    act(() => callback("hlsError", { fatal: true, url: "https://evil.test/?secret=1" }));
    expect(screen.getByRole("alert").textContent).toContain("HLS playback failed");
    expect(screen.getByRole("alert").textContent).not.toContain("secret");
    expect(log).not.toHaveBeenCalled();
  });
});
