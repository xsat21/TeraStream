"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import type { ResolveResult } from "@/lib/providers/types";
import { validateShareUrl } from "@/lib/share-url";
import { isResolveResult } from "@/lib/providers/validate-result";

export function Workspace({ adsEnabled = false, providerMode = "mock" }: { adsEnabled?: boolean; providerMode?: "mock" | "official" | "invalid" }) {
  const demo = providerMode === "mock";
  const [url, setUrl] = useState("");
  const [theme, setTheme] = useState<"light" | "dark" | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [intent, setIntent] = useState<"watch" | "download">("watch");
  const output = useRef<HTMLElement>(null);

  async function resolve(action: "watch" | "download") {
    if (loading) return;
    setError("");
    setResult(null);
    setIntent(action);
    try { validateShareUrl(url); } catch (err) {
      setError((err as Error).message);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/resolve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }), cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not read this share. Please try again.");
      if (providerMode === "invalid" || !isResolveResult(data, providerMode)) throw new Error("The provider returned an invalid or unverified response. No media was enabled.");
      setResult(data);
      output.current?.focus();
    } catch (err) {
      setError(err instanceof Error && err.name === "TimeoutError" ? "The request timed out. Please try again." :
        err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  }

  function toggleTheme() {
    const current = theme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(current === "dark" ? "light" : "dark");
  }

  return (
    <div className="site" data-theme={theme}>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="header shell">
        <Link className="brand" href="/" aria-label="TeraStream home"><span className="brand-icon"><Icon name="play" /></span>Tera<span>Stream</span></Link>
        <nav aria-label="Main navigation" className="flex items-center gap-6">
          <a className="nav-link" href="#how-it-works">How it works</a>
          <a className="github-link" href="https://github.com/xsat21/TeraStream" rel="noreferrer">GitHub <Icon name="external" /></a>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle color theme"><Icon name="theme" /></button>
        </nav>
      </header>

      <main id="main" className="shell">
        <section className="hero" aria-labelledby="hero-title">
          <div className="eyebrow"><span className="status-dot" /> OPEN SOURCE. OPEN POSSIBILITIES.</div>
          <h1 id="hero-title">Your link.<br /><span>Your screen.</span></h1>
          <p className="hero-copy">A simpler space for your TeraBox shares.<br className="hidden sm:block" /> View file details, watch, and download — on your terms.</p>

          <form className="link-card" aria-label="Resolve a public share" onSubmit={(event) => { event.preventDefault(); void resolve("watch"); }}>
            <div className="card-heading"><span className="step">01</span><label htmlFor="share-url">Start with a public-share link</label><span className="demo-badge">{demo ? "MOCK PROVIDER" : "OFFICIAL · NOT CONFIGURED"}</span></div>
            <div className="input-wrap"><span><Icon name="link" /></span><input id="share-url" name="share-url" type="url" required maxLength={2048} autoComplete="off" spellCheck={false} placeholder="https://www.terabox.com/s/…" value={url} onChange={(event) => { setUrl(event.target.value); setError(""); setResult(null); }} aria-describedby="share-hint share-feedback" aria-invalid={!!error} disabled={loading} /></div>
            <div className="form-actions">
              <button className="button button-primary" type="submit" disabled={loading}><Icon name="play" />{loading && intent === "watch" ? "Checking link…" : "Watch"}</button>
              <button className="button button-secondary" type="button" disabled={loading} onClick={() => void resolve("download")}><Icon name="download" />{loading && intent === "download" ? "Checking link…" : "Download"}</button>
            </div>
            <p id="share-hint" className="hint">Use only public content you own or are authorized to access.</p>
            {!demo && <p className="feedback error" role="status">{providerMode === "invalid" ? "Invalid provider mode. Ask the administrator to set TERASTREAM_PROVIDER to mock or official." : "Official integration is not configured. API documentation and authorized access need verification; live metadata, playback and downloads are disabled."}</p>}
            <div id="share-feedback" aria-live="polite" aria-atomic="true">
              {loading && <p className="feedback">{demo ? "Loading demo file information…" : "Checking official provider configuration…"}</p>}
              {error && <p className="feedback error" role="alert">{error}</p>}
            </div>
          </form>
          <p className="privacy-line"><span aria-hidden="true">◇</span> No media uploads. No tracking scripts.</p>
        </section>

        <section ref={output} tabIndex={-1} className="workspace" aria-label="Share preview" aria-busy={loading}>
          <div className="player-card">
            <div className="panel-heading"><span className="tiny-label">THE VIEWING ROOM</span><span className="pill">{result ? "DEMO PREVIEW" : "READY WHEN YOU ARE"}</span></div>
            <div className="player-placeholder">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <span className="play-symbol"><Icon name="play" /></span>
              <h2>{loading ? "Reading your link…" : result ? "This is a demo, not your video" : "A little space for the big picture"}</h2>
              <p>{result ? result.stream.status === "verified" ? "Live playback is not enabled in this prototype." : result.stream.reason : "Your player preview will appear here."}</p>
              <span className="player-note">Live TeraBox playback has not been verified.</span>
            </div>
            <div className="player-footer"><span><span className="status-dot" /> {result ? "Mock data only" : "No media loaded"}</span><span>YOUR MEDIA STAYS YOURS</span></div>
          </div>

          <aside className="file-card" aria-labelledby="file-heading">
            <div className="card-heading"><span className="step">02</span><h2 id="file-heading">File information</h2></div>
            <div className="file-icon"><Icon name="file" /></div>
            <h3>{result ? result.file.name : "Meet your next watch"}</h3>
            <p className="file-description">{result ? "Illustrative fixture. These details do not describe the submitted share." : demo ? "Add a public-share link above to explore the demo workflow." : "No live file information is available until authorized integration is configured."}</p>
            <dl className="file-details">
              <div><dt>File type</dt><dd>{result ? result.file.mimeType : "—"}</dd></div>
              <div><dt>File size</dt><dd>{result?.file.sizeBytes != null ? `${(result.file.sizeBytes / 1024 / 1024).toFixed(0)} MiB (sample)` : "—"}</dd></div>
              <div><dt>Provider</dt><dd><span className="provider-dot" />{demo ? "Mock · demo only" : "Official · not configured"}</dd></div>
              <div><dt>Availability</dt><dd>Not verified</dd></div>
            </dl>
            <div className="info-note">{result && intent === "download" && result.download.status !== "verified" ? result.download.reason : "No live media is fetched, stored, or streamed in this prototype."}</div>
          </aside>
        </section>

        <aside className="ad-slot" aria-label={adsEnabled ? "Advertisement placeholder" : "Advertising disabled"}>
          <span className="tiny-label">{adsEnabled ? "ADVERTISEMENT · PLACEHOLDER" : "ADS OFF BY DEFAULT"}</span>
          <p>{adsEnabled ? "Reserved space. No ad network is connected." : "A quieter experience. Optional ad space stays separate from your player."}</p>
          <span aria-hidden="true">✧</span>
        </aside>

        <section id="how-it-works" className="how-section" aria-labelledby="how-heading">
          <div className="section-intro"><span className="tiny-label">LESS FRICTION, MORE FREEDOM</span><h2 id="how-heading">Simple by design.</h2><p>An open foundation for a better viewing experience.</p></div>
          <div className="features">
            <article><span className="feature-number">01 / PASTE</span><h3>Bring your own link</h3><p>Start with an authorized public share. Only explicitly supported TeraBox hosts are accepted.</p></article>
            <article><span className="feature-number">02 / PREVIEW</span><h3>Know what you’re opening</h3><p>Explore sample file details today. Real metadata needs a documented provider integration.</p></article>
            <article><span className="feature-number">03 / YOUR CHOICE</span><h3>Watch. Save. Stay in control.</h3><p>Playback and downloads stay unavailable until real links and browser compatibility are verified.</p></article>
          </div>
        </section>
      </main>

      <footer className="footer shell"><div><Link className="brand footer-brand" href="/">Tera<span>Stream</span></Link><p>Independent. Open source. Built with privacy in mind.</p></div><p>Not affiliated with TeraBox.<br /><a href="https://github.com/xsat21/TeraStream/blob/main/LICENSE" rel="noreferrer">MIT licensed <Icon name="external" /></a></p></footer>
    </div>
  );
}
