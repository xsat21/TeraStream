import { createRoot } from "react-dom/client";
import { VideoPlayer } from "../../src/components/video-player";
import { fixtureSource } from "../fixtures/playback";

const format = new URLSearchParams(location.search).get("format") === "hls" ? "hls" : "mp4";
createRoot(document.getElementById("root")!).render(<VideoPlayer source={fixtureSource(format)} title="Synthetic CC0 test pattern" />);
