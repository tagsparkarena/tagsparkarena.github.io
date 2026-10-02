import { describe, it, expect } from "vitest";
import { World, idle } from "../src/engine";
import { MAPS, MODIFIERS } from "../src/maps";
import { TUNING as T, WORLD as W } from "../src/config";

describe("faster chase and flat routes", () => {
  it("accelerates promptly, stops predictably, and catches contacts at boosted speed", () => {
    const world = new World(MAPS[0], MODIFIERS[0], [0, 1], 0, 90, [], "pace");
    const [p, runner] = world.players;
    for (let i = 0; i < 16; i++)
      world.tick(W.step, { 0: { ...idle, right: true } });
    expect(p.vx).toBe(T.speed);
    const stopX = p.x;
    for (let i = 0; i < 16; i++) world.tick(W.step, {});
    expect(p.vx).toBe(0);
    expect(p.x - stopX).toBeLessThan(25);
    world.time = 3;
    p.safeUntil = runner.safeUntil = 0;
    p.x = 400;
    runner.x = 470;
    p.buffs.speed = 7;
    for (let i = 0; i < 30; i++)
      world.tick(W.step, { 0: { ...idle, right: true } });
    expect(world.it).toBe(1);
  });
  it.each(MAPS.map((m) => [m.name, m] as const))(
    "%s has no surprise surfaces and reachable upper routes",
    (_name, map) => {
      const platforms = [{ x: 0, y: W.floor, w: W.width }, ...map.platforms];
      expect(map.platforms.length).toBeGreaterThanOrEqual(9);
      expect(
        map.platforms.every((p) => !p.slope && !p.ice && !p.bounce && !p.move),
      ).toBe(true);
      expect(
        map.platforms.every(
          (p) => p.x >= 25 && p.x + p.w <= W.width - 25 && p.w >= 130,
        ),
      ).toBe(true);
      // Conservative jump envelope: subtract run-up distance and require 20px
      // landing overlap. This checks route connectivity, not human play balance.
      const reached = new Set([0]);
      for (let pass = 0; pass < platforms.length; pass++) {
        platforms.forEach((to, i) => {
          for (const j of reached) {
            const from = platforms[j];
            const rise = from.y - to.y;
            const discriminant = T.jump * T.jump - 2 * T.gravity * rise;
            if (discriminant < 0) continue;
            const air = (T.jump + Math.sqrt(discriminant)) / T.gravity;
            const gap = Math.max(
              0,
              to.x - (from.x + from.w),
              from.x - (to.x + to.w),
            );
            if (gap + 20 < T.speed * air - 40) reached.add(i);
          }
        });
      }
      expect(reached.size).toBe(platforms.length);
      // A real held jump from ground must reach each map's first tier.
      const world = new World(map, MODIFIERS[0], [0, 1], 0, 90, [], "jump");
      const target = map.platforms[0],
        p = world.players[0];
      p.x = target.x + target.w / 2;
      for (let i = 0; i < 100; i++)
        world.tick(W.step, { 0: { ...idle, jump: true } });
      expect(p.ground).toBe(1);
    },
  );
});
