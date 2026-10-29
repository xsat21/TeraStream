import { expect, it } from "vitest";
import { mediaCsp, mediaConnectionsCsp, playbackProblem, permittedMediaUrl } from "../src/lib/media-policy";
import { fixtureSource } from "./fixtures/playback";

it("keeps production media blocked; fixtures do not add production origins", () => {
  expect(mediaCsp()).toBe("'none'");
  expect(mediaConnectionsCsp()).toBe("'self'");
  expect(permittedMediaUrl(fixtureSource().url)).toBe(false);
  expect(playbackProblem(fixtureSource())).toContain("not authorized");
});
