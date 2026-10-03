import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import {
  AD_CONFIG,
  AD_PLACEMENTS,
  adPlaceholder,
  gameAdRails,
} from "../src/ads";

describe("reserved advertising inventory", () => {
  it("does not enable manual units or forced interstitials", () => {
    expect(AD_CONFIG.enabled).toBe(false);
    expect(AD_CONFIG.betweenMatches).toBe(false);
  });
  it("gives placements distinct identifiers and clear labels", () => {
    for (const id of Object.keys(
      AD_PLACEMENTS,
    ) as (keyof typeof AD_PLACEMENTS)[]) {
      const html = adPlaceholder(id);
      expect(html).toContain(`data-ad-placement="${id}"`);
      expect(html).toContain("ADVERTISEMENT");
      expect(html).not.toMatch(/<script|<iframe|<button/);
    }
  });
  it("reserves separate slots on each side of the game", () => {
    expect(gameAdRails()).toContain('data-ad-placement="game-left"');
    expect(gameAdRails()).toContain('data-ad-placement="game-right"');
  });
});

describe("public AdSense connection", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const loader = html.match(
    /<script id="tagspark-adsense-loader">([\s\S]*?)<\/script>/,
  )?.[1];

  function runLoader(origin: string) {
    const scripts: Record<string, unknown>[] = [];
    expect(loader).toBeTruthy();
    runInNewContext(loader!, {
      location: { origin },
      document: {
        createElement: () => ({}),
        head: {
          appendChild: (script: Record<string, unknown>) =>
            scripts.push(script),
        },
      },
    });
    return scripts;
  }

  it("loads the owner's asynchronous AdSense tag in the public site's head", () => {
    expect(runLoader("https://tagsparkarena.github.io")).toEqual([
      {
        id: "tagspark-adsense",
        async: true,
        crossOrigin: "anonymous",
        src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4197964753033984",
      },
    ]);
  });

  it.each([
    "http://127.0.0.1:4174",
    "http://localhost:5173",
    "null",
    "https://preview.example.com",
    "http://tagsparkarena.github.io",
    "https://tagsparkarena.github.io.example.com",
  ])("does not contact Google from %s", (origin) => {
    expect(runLoader(origin)).toEqual([]);
  });
});
