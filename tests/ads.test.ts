import { describe, expect, it } from "vitest";
import {
  AD_CONFIG,
  AD_PLACEMENTS,
  adPlaceholder,
  gameAdRails,
} from "../src/ads";

describe("reserved advertising inventory", () => {
  it("does not enable live ads or forced interstitials", () => {
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
