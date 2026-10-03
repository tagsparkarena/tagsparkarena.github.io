import { describe, it, expect } from "vitest";
import { MAPS } from "../src/maps";
import { WORLD, TUNING } from "../src/config";

describe("deliberate arena layouts", () => {
  it.each(MAPS)("$name uses solid decks as the majority", (map) => {
    const decks = map.platforms.filter((p) => !p.wall);
    const blue = decks.filter((p) => p.oneWay);
    expect(blue).toHaveLength(4);
    expect(decks.length - blue.length).toBeGreaterThan(blue.length);
    expect(blue.length / decks.length).toBeLessThan(1 / 2);
  });
  it("wall layouts differ between all four walled arenas", () => {
    const walled = MAPS.filter((m) => m.platforms.some((p) => p.wall));
    expect(walled).toHaveLength(4);
    const signatures = walled.map((m) =>
      m.platforms
        .filter((p) => p.wall)
        .map((p) => `${p.x},${p.y},${p.h}`)
        .join(";"),
    );
    expect(new Set(signatures).size).toBe(4);
    const positions = walled.flatMap((m) =>
      m.platforms.filter((p) => p.wall).map((p) => `${p.x},${p.y}`),
    );
    expect(new Set(positions).size).toBe(positions.length);
  });
  it.each(MAPS.filter((m) => m.platforms.some((p) => p.wall)))(
    "$name walls join solid shelves with usable bay space",
    (map) => {
      const walls = map.platforms.filter((p) => p.wall);
      const decks = map.platforms.filter((p) => !p.wall && !p.oneWay);
      expect(walls.length).toBeGreaterThanOrEqual(3);
      expect(new Set(walls.map((p) => p.y)).size).toBeGreaterThanOrEqual(2);
      for (const wall of walls) {
        const roof = decks.find(
          (p) =>
            p.y + p.h! === wall.y &&
            wall.x >= p.x &&
            wall.x + wall.w <= p.x + p.w,
        );
        const floor = [...decks, { x: 0, y: WORLD.floor, w: WORLD.width }].find(
          (p) =>
            p.y === wall.y + wall.h! &&
            wall.x >= p.x &&
            wall.x + wall.w <= p.x + p.w,
        );
        expect(roof).toBeDefined();
        expect(floor).toBeDefined();
        // The recess beside the wall must have room for at least two player widths.
        const left = wall.x - Math.max(roof!.x, floor!.x);
        const right =
          Math.min(roof!.x + roof!.w, floor!.x + floor!.w) - wall.x - wall.w;
        expect(Math.max(left, right)).toBeGreaterThanOrEqual(
          TUNING.playerWidth * 2,
        );
        expect(wall.h).toBeGreaterThan(TUNING.playerHeight * 2);
      }
    },
  );
});
