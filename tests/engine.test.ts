import { describe, it, expect } from "vitest";
import {
  World,
  selectRound,
  scoreRound,
  winners,
  idle,
  seededRandom,
  type Input,
  type Pickup,
} from "../src/engine";
import { MAPS, MODIFIERS } from "../src/maps";
import { TUNING, WORLD } from "../src/config";
const make = (ids = [0, 1], map = 0, mod = 0) =>
  new World(
    MAPS[map],
    MODIFIERS[mod],
    ids,
    ids[0],
    90,
    ["speed", "shield", "double"],
    "test",
  );
function advance(w: World, n: number, input: Record<number, Input> = {}) {
  for (let i = 0; i < Math.round(n / WORLD.step); i++)
    w.tick(WORLD.step, input);
}
const item = (kind: Pickup["kind"]): Pickup => ({
  id: 1,
  kind,
  x: 0,
  y: 0,
  ready: 0,
  expires: 20,
});
describe("rules and fairness", () => {
  it.each([2, 3, 4])("initializes only %i joined players", (n) => {
    const ids = Array.from({ length: n }, (_, i) => i);
    expect(make(ids).players.map((p) => p.id)).toEqual(ids);
  });
  it("rotates starting It fairly, reproducing map/modifier selection", () => {
    for (const ids of [
      [0, 1],
      [0, 2, 3],
      [0, 1, 2, 3],
    ]) {
      const choices = ids.map((_, i) =>
        selectRound(
          "seed",
          i,
          MAPS.map((m) => m.id),
          MODIFIERS.map((m) => m.id),
          ids,
        ),
      );
      expect(new Set(choices.map((c) => c.it)).size).toBe(ids.length);
      expect(choices[0]).toEqual(
        selectRound(
          "seed",
          0,
          MAPS.map((m) => m.id),
          MODIFIERS.map((m) => m.id),
          ids,
        ),
      );
    }
  });
  it("honors custom filters and falls back to classic with no modifiers", () => {
    expect(selectRound("x", 0, ["cloud"], [], [0, 1]).map.id).toBe("cloud");
    expect(selectRound("x", 0, ["cloud"], [], [0, 1]).modifier.id).toBe(
      "classic",
    );
  });
  it("rejects missing players/maps", () => {
    expect(() => make([0])).toThrow();
    expect(() => selectRound("x", 0, [], [], [0, 1])).toThrow();
  });
  it("blocks spawn tags, then transfers It and blocks instant retags", () => {
    const w = make();
    const [a, b] = w.players;
    expect(w.tag(a, b)).toBe(false);
    advance(w, 2.1);
    expect(w.tag(a, b)).toBe(true);
    expect(w.it).toBe(1);
    expect(w.tag(b, a)).toBe(false);
    advance(w, 1.3);
    expect(w.tag(b, a)).toBe(true);
  });
  it("awards survivors, not least time as It", () => {
    const w = make([0, 1, 2]);
    w.players[0].itTime = 0;
    w.players[1].itTime = 70;
    w.ended = true;
    const scores = scoreRound(
      w.players.map((p) => ({
        id: p.id,
        wins: 0,
        itTime: 0,
        tags: 0,
        pickups: 0,
      })),
      w,
    );
    expect(scores.map((s) => s.wins)).toEqual([0, 1, 1]);
    expect(winners(scores)).toEqual([1, 2]);
  });
  it("stops at the buzzer without a last-frame tag or extra score time", () => {
    const w = make();
    w.duration = 0.01;
    w.remaining = 0.01;
    w.tagLockedUntil = 0;
    w.players.forEach((p) => {
      p.x = 500;
      p.safeUntil = 0;
    });
    w.tick(0.02, {});
    expect(w.ended).toBe(true);
    expect(w.it).toBe(0);
    expect(w.players[0].itTime).toBeCloseTo(0.01);
    w.tick(5, {});
    expect(w.time).toBeCloseTo(0.01);
  });
  it("caps catch-up speed and resets it after a tag", () => {
    const w = make();
    w.time = 100;
    w.players.forEach((p) => (p.safeUntil = 0));
    expect(w.speed(w.players[0])).toBeCloseTo(TUNING.speed * 1.12);
    w.tag(w.players[0], w.players[1]);
    expect(w.speed(w.players[1])).toBe(TUNING.speed);
  });
});
describe("power-ups", () => {
  it("speed refreshes instead of stacking and expires cleanly", () => {
    const w = make();
    const p = w.players[1];
    w.collect(p, item("speed"));
    w.collect(p, item("speed"));
    expect(w.speed(p)).toBeCloseTo(TUNING.speed * 1.2);
    w.time = 4.01;
    expect(w.active(p, "speed")).toBe(false);
    expect(w.speed(p)).toBe(TUNING.speed);
  });
  it("shield excludes It, protects runners for three seconds and cannot chain", () => {
    const w = make();
    const [a, b] = w.players;
    expect(w.collect(a, item("shield"))).toBe(false);
    w.time = 3;
    a.safeUntil = b.safeUntil = 0;
    expect(w.collect(b, item("shield"))).toBe(true);
    expect(w.tag(a, b)).toBe(false);
    w.time = 6.1;
    expect(w.active(b, "shield")).toBe(false);
    expect(w.collect(b, item("shield"))).toBe(false);
    w.time = 13.1;
    expect(w.collect(b, item("shield"))).toBe(true);
  });
  it("allows one extra jump per airtime and no extra jump after expiry", () => {
    const w = make();
    const p = w.players[1];
    w.collect(p, item("double"));
    advance(w, 0.1, { 1: { ...idle, jump: true } });
    advance(w, 0.1);
    w.tick(WORLD.step, { 1: { ...idle, jump: true } });
    expect(p.jumps).toBe(2);
    advance(w, 0.02);
    const vy = p.vy;
    w.tick(WORLD.step, { 1: { ...idle, jump: true } });
    expect(p.vy).toBeGreaterThan(vy);
    w.time = 8.1;
    expect(w.active(p, "double")).toBe(false);
  });
  it("telegraphs spawns, caps items and avoids overlapping players", () => {
    const w = make();
    for (let i = 0; i < 10; i++) w.spawnPower();
    expect(w.pickups.length).toBeLessThanOrEqual(TUNING.maxPowers);
    expect(w.pickups.length).toBeGreaterThan(0);
    for (const p of w.pickups) {
      expect(p.ready).toBeGreaterThan(w.time);
      expect(
        w.players.every((q) => Math.hypot(p.x - q.x, p.y - q.y + 20) > 80),
      ).toBe(true);
    }
  });
  it("resets all buffs in a new round", () => {
    const first = make();
    first.collect(first.players[1], item("double"));
    expect(
      make().players.every((p) => Object.values(p.buffs).every((n) => n === 0)),
    ).toBe(true);
  });
});
describe("movement and maps", () => {
  it("short release produces a lower jump than holding", () => {
    const a = make(),
      b = make();
    advance(a, 0.06, { 0: { ...idle, jump: true } });
    advance(b, 0.06, { 0: { ...idle, jump: true } });
    advance(a, 0.18);
    advance(b, 0.18, { 0: { ...idle, jump: true } });
    expect(a.players[0].y).toBeGreaterThan(b.players[0].y);
  });
  it("supports simultaneous independent input and one-way drop", () => {
    const w = make();
    advance(w, 0.15, {
      0: { ...idle, right: true, jump: true },
      1: { ...idle, left: true, jump: true },
    });
    expect(w.players[0].x).toBeGreaterThan(95);
    expect(w.players[1].x).toBeLessThan(905);
    expect(w.players.every((p) => p.y < 530)).toBe(true);
    const p = w.players[0];
    p.x = 120;
    p.y = 437;
    p.ground = 1;
    p.vy = 0;
    w.tick(WORLD.step, { 0: { ...idle, action: true } });
    expect(p.y).toBeGreaterThan(437);
    expect(p.ground).toBe(-1);
  });
  it("carries a stationary rider on a moving platform", () => {
    const w = make([0, 1], 2);
    const p = w.players[0];
    p.x = 120;
    p.y = 431;
    p.ground = 1;
    const offset = p.x - w.platforms[1].x;
    advance(w, 0.5);
    expect(p.x - w.platforms[1].x).toBeCloseTo(offset, 1);
    expect(p.ground).toBe(1);
  });
  it("portals have a cooldown and keep player inside world", () => {
    const w = make([0, 1], 4);
    const p = w.players[0];
    p.x = 19;
    advance(w, 0.02);
    expect(p.x).toBeGreaterThan(900);
    expect(p.portalUntil).toBeGreaterThan(w.time);
  });
  it("rescues an out-of-bounds player", () => {
    const w = make();
    w.players[0].y = 900;
    w.tick(WORLD.step, {});
    expect(w.players[0].y).toBe(530);
    expect(w.players[0].safeUntil).toBeGreaterThan(w.time);
  });
  it.each(MAPS.map((m, i) => [m.name, i] as const))(
    "%s remains finite for every modifier and four players",
    (_name, index) => {
      for (let mod = 0; mod < MODIFIERS.length; mod++) {
        const w = make([0, 1, 2, 3], index, mod);
        const rng = seededRandom("playtest");
        for (let i = 0; i < 1200; i++) {
          const inputs = Object.fromEntries(
            w.players.map((p) => [
              p.id,
              {
                left: rng() < 0.45,
                right: rng() < 0.45,
                jump: rng() < 0.08,
                action: rng() < 0.005,
              },
            ]),
          );
          w.tick(1 / 60, inputs);
        }
        expect(
          w.players.every(
            (p) =>
              Number.isFinite(p.x + p.y) &&
              p.x >= 18 &&
              p.x <= 982 &&
              p.y <= 560,
          ),
        ).toBe(true);
      }
    },
  );
});
