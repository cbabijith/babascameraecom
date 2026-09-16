import { describe, expect, test } from "bun:test";

import {
  findUnresolvableMedia,
  restoreStoredMediaReferences,
} from "./media-references";

// Without media env vars the proxy resolves Tigris URLs to /api/media/<key>.
const STORED = "https://buffered-suitcase-ixzwmo4.t3.storageapi.dev/images/desktop-demo.webp";
const DISPLAY = "/api/media/images/desktop-demo.webp";

describe("banner media reference round-trip", () => {
  test("swaps echoed display paths back to the stored reference", () => {
    const previous = { desktopMediaUrl: STORED, mobileMediaUrl: null, posterUrl: null };
    const restored = restoreStoredMediaReferences(
      { desktopMediaUrl: DISPLAY, mobileMediaUrl: null, posterUrl: null },
      previous,
    );
    expect(restored.desktopMediaUrl).toBe(STORED);
  });

  test("keeps genuinely new uploads untouched", () => {
    const previous = { desktopMediaUrl: STORED, mobileMediaUrl: null, posterUrl: null };
    const fresh = "https://buffered-suitcase-ixzwmo4.t3.storageapi.dev/images/desktop-new.webp";
    const restored = restoreStoredMediaReferences(
      { desktopMediaUrl: fresh, mobileMediaUrl: null, posterUrl: null },
      previous,
    );
    expect(restored.desktopMediaUrl).toBe(fresh);
  });

  test("leaves stored values unchanged when they already match", () => {
    const previous = { desktopMediaUrl: STORED, mobileMediaUrl: null, posterUrl: null };
    const restored = restoreStoredMediaReferences(
      { desktopMediaUrl: STORED, mobileMediaUrl: null, posterUrl: null },
      previous,
    );
    expect(restored.desktopMediaUrl).toBe(STORED);
  });

  test("flags proxy paths that cannot be mapped to a stored asset", () => {
    const parsed = { desktopMediaUrl: "/api/media/images/some-other.webp", mobileMediaUrl: null, posterUrl: null };
    expect(findUnresolvableMedia(parsed)).toBe("desktopMediaUrl");
    expect(findUnresolvableMedia({ desktopMediaUrl: STORED, mobileMediaUrl: null, posterUrl: null })).toBeNull();
  });
});
