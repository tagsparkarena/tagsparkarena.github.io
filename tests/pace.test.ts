import { describe, it, expect } from "vitest";
import { World, idle } from "../src/engine";
import { MAPS, MODIFIERS } from "../src/maps";
import { TUNING as T, WORLD as W } from "../src/config";

describe("faster chase and flat routes", () => {
  it("holding drop falls through stacked platforms exactly like an empty arena", () => {
    const platforms = [200, 290, 380, 470].map((y) => ({
      x: 100,
      y,
      w: 800,
      oneWay: true,
    }));
    const make = (decks: typeof platforms) => {
      const w = new World(
        { ...MAPS[0], platforms: decks },
        MODIFIERS[0],
        [0, 1],
        0,
        90,
        [],
        "drop",
      );
      Object.assign(w.players[0], {
        x: 500,
        y: 100,
        vy: 100,
        ground: -1,
        lastGround: -99,
      });
      return w;
    };
    const stacked = make(platforms),
      empty = make([]);
    for (let i = 0; i < 100; i++) {
      stacked.tick(W.step, { 0: { ...idle, action: true } });
      empty.tick(W.step, { 0: { ...idle, action: true } });
      expect(stacked.players[0].y).toBe(empty.players[0].y);
      expect(stacked.players[0].vy).toBe(empty.players[0].vy);
    }
    expect(stacked.players[0].ground).toBe(0);
    const released = make(platforms);
    for (let i = 0; i < 15; i++)
      released.tick(W.step, { 0: { ...idle, action: true } });
    for (let i = 0; i < 30; i++) released.tick(W.step, {});
    expect(released.players[0].ground).toBe(1);
    expect(released.players[0].y).toBe(200);
  });
  it("reaches full speed and reverses direction within 100 milliseconds", () => {
    const world = new World(MAPS[0], MODIFIERS[0], [0, 1], 0, 90, [], "juke");
    const p = world.players[0];
    p.x = 500;
    for (let i = 0; i < 12; i++)
      world.tick(W.step, { 0: { ...idle, right: true } });
    expect(p.vx).toBe(T.speed);
    for (let i = 0; i < 12; i++)
      world.tick(W.step, { 0: { ...idle, left: true } });
    expect(p.vx).toBe(-T.speed);
  });
  it("a single-frame tap clears 125px while holding retains extra height", () => {
    const heights = [false, true].map((hold) => {
      const world = new World(
        { ...MAPS[0], platforms: [] },
        MODIFIERS[0],
        [0, 1],
        0,
        90,
        [],
        "tap",
      );
      const p = world.players[0];
      const start = p.y;
      let peak = start;
      for (let i = 0; i < 100; i++) {
        world.tick(W.step, { 0: { ...idle, jump: hold || i === 0 } });
        peak = Math.min(peak, p.y);
      }
      return start - peak;
    });
    expect(heights[0]).toBeGreaterThan(125);
    expect(heights[1]).toBeGreaterThan(heights[0]);
    expect(heights[1] - heights[0]).toBeLessThan(45);
  });
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
          (p) =>
            p.x >= 25 &&
            p.x + p.w <= W.width - 25 &&
            (p.wall ? p.w >= 30 : p.w >= 130),
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
      // Even a one-frame tap must reach each map's first tier.
      const world = new World(map, MODIFIERS[0], [0, 1], 0, 90, [], "jump");
      const target = map.platforms[0],
        p = world.players[0];
      p.x = target.x + target.w / 2;
      for (let i = 0; i < 100; i++)
        world.tick(W.step, { 0: { ...idle, jump: i === 0 } });
      expect(p.ground).toBe(1);
    },
  );
});
