// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Workspace } from "../src/components/workspace";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const fixture = {
  provider: "mock", file: { id: "demo-file", name: "Sample film.mp4 (demo)", sizeBytes: 134217728, mimeType: "video/mp4", source: "mock" },
  stream: { status: "unavailable", reason: "No verified stream." },
  download: { status: "unavailable", reason: "No real download URL is available." },
};

describe("share workspace", () => {
  it("shows official configuration blocker with no sample metadata or player", () => {
    const { container } = render(<Workspace providerMode="official" />);
    expect(screen.getByRole("status").textContent).toContain("Official integration is not configured");
    expect(screen.queryByText("MOCK PROVIDER")).toBeNull();
    expect(container.textContent).not.toContain("Sample film.mp4");
    expect(container.querySelector("video, iframe")).toBeNull();
  });
  it("rejects forged verified playback data without creating a video or download link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...fixture, stream: { status: "verified", url: "https://evil.test/video" } })));
    const { container } = render(<Workspace />);
    fireEvent.change(screen.getByLabelText("Start with a public-share link"), { target: { value: "https://terabox.com/s/demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect((await screen.findByRole("alert")).textContent).toContain("invalid or unverified");
    expect(container.querySelector('video, iframe, a[href="https://evil.test/video"]')).toBeNull();
  });
  it("keeps ads disabled and player inert by default", () => {
    const { container } = render(<Workspace />);
    expect(screen.getByLabelText("Advertising disabled")).toBeDefined();
    expect(container.querySelector("video, iframe")).toBeNull();
    expect(screen.getByText("Live TeraBox playback has not been verified.")).toBeDefined();
  });
  it("provides an isolated ad placeholder when enabled", () => {
    render(<Workspace adsEnabled />);
    expect(screen.getByLabelText("Advertisement placeholder").textContent).toContain("No ad network");
  });
  it("rejects unsafe URLs without calling the API", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    render(<Workspace />);
    fireEvent.change(screen.getByLabelText("Start with a public-share link"), { target: { value: "https://localhost/s/demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("shows loading, mock metadata and unavailable download states", async () => {
    let complete!: (response: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>((resolve) => { complete = resolve; }));
    vi.stubGlobal("fetch", fetch);
    render(<Workspace />);
    fireEvent.change(screen.getByLabelText("Start with a public-share link"), { target: { value: "https://terabox.com/s/demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(screen.getByText("Loading demo file information…")).toBeDefined();
    expect((screen.getByRole("button", { name: "Watch" }) as HTMLButtonElement).disabled).toBe(true);
    complete(Response.json(fixture));
    expect(await screen.findByText("Sample film.mp4 (demo)")).toBeDefined();
    expect(screen.getByText("No real download URL is available.")).toBeDefined();
    expect(fetch).toHaveBeenCalledWith("/api/resolve", expect.objectContaining({ method: "POST", cache: "no-store" }));
    fireEvent.change(screen.getByLabelText("Start with a public-share link"), { target: { value: "https://terabox.com/s/other" } });
    expect(screen.queryByText("Sample film.mp4 (demo)")).toBeNull();
  });
  it("shows network errors and permits retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")));
    render(<Workspace />);
    fireEvent.change(screen.getByLabelText("Start with a public-share link"), { target: { value: "https://terabox.com/s/demo" } });
    fireEvent.submit(screen.getByRole("form", { name: "Resolve a public share" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Network unavailable");
    await waitFor(() => expect((screen.getByRole("button", { name: "Watch" }) as HTMLButtonElement).disabled).toBe(false));
  });
  it("toggles the color theme", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const { container } = render(<Workspace />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle color theme" }));
    expect(container.firstElementChild?.getAttribute("data-theme")).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Toggle color theme" }));
    expect(container.firstElementChild?.getAttribute("data-theme")).toBe("light");
  });
});
