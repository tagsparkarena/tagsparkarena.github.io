import { describe, it, expect, vi, afterEach } from "vitest";
import { World, idle, seededRandom, type Input } from "../src/engine";
import { MAPS, MODIFIERS, type Platform } from "../src/maps";
import { TUNING as T, WORLD as W } from "../src/config";
import { defaults, loadSettings, saveSettings } from "../src/storage";

const make = (platforms: Platform[], doubleJump = false) =>
  new World(
    { ...MAPS[0], platforms },
    { ...MODIFIERS[0], doubleJump },
    [0, 1],
    0,
    90,
    ["speed", "shield", "double"],
    "solid-test",
  );
const step = (w: World, frames: number, input: Partial<Input> = {}) => {
  for (let i = 0; i < frames; i++) w.tick(W.step, { 0: { ...idle, ...input } });
};
describe("solid surfaces and larger arenas", () => {
  it.each([-1, 1])(
    "stops a boosted player at a wall from direction %i",
    (dir) => {
      const w = make([{ x: 600, y: W.floor - 160, w: 34, h: 160, wall: true }]);
      const p = w.players[0];
      p.x = dir === 1 ? 520 : 714;
      p.buffs.speed = 99;
      step(w, 60, { right: dir === 1, left: dir === -1, action: true });
      expect(p.x).toBe(
        dir === 1 ? 600 - T.playerWidth / 2 : 634 + T.playerWidth / 2,
      );
      expect(p.vx).toBe(0);
    },
  );
  it("solid platforms block the underside and cannot be dropped through", () => {
    const w = make([{ x: 300, y: W.floor - 100, w: 250, h: 26 }]);
    const p = w.players[0];
    p.x = 400;
    step(w, 10, { jump: true });
    expect(p.y - T.playerHeight).toBeGreaterThanOrEqual(W.floor - 74);
    expect(p.vy).toBeGreaterThanOrEqual(0);
    p.y = W.floor - 100;
    p.vy = 0;
    p.ground = 1;
    step(w, 45, { action: true });
    expect(p.ground).toBe(1);
    expect(p.y).toBe(W.floor - 100);
  });
  it("drops through blue decks but lands on the solid deck below", () => {
    const w = make([
      { x: 300, y: 400, w: 250, h: 26, oneWay: true },
      { x: 300, y: 570, w: 250, h: 26 },
    ]);
    Object.assign(w.players[0], { x: 400, y: 400, ground: 1 });
    step(w, 70, { action: true });
    expect(w.players[0].y).toBe(570);
    expect(w.players[0].ground).toBe(2);
  });
  it("only one-way decks move in the moving modifier", () => {
    const w = make([
      { x: 100, y: 400, w: 200, oneWay: true },
      { x: 600, y: 600, w: 34, h: 144, wall: true },
    ]);
    w.modifier.moving = true;
    step(w, 120);
    expect(w.platforms[1].x).not.toBe(100);
    expect(w.platforms[2].x).toBe(600);
  });
  it("dropping from a blue deck cannot nudge a player into a nearby wall top", () => {
    const w = make([
      { x: 300, y: 618, w: 250, oneWay: true },
      { x: 450, y: 619, w: 34, h: 125, wall: true },
    ]);
    Object.assign(w.players[0], { x: 475, y: 618, ground: 1 });
    step(w, 30, { action: true });
    expect(w.players[0].y).toBe(619);
    expect(w.players[0].ground).toBe(2);
  });
  it.each(MAPS)(
    "$name has clear four-player spawns and no solid penetration",
    (map) => {
      expect(W.width).toBe(1400);
      expect(W.height).toBe(784);
      expect(map.platforms.some((p) => p.oneWay)).toBe(true);
      expect(map.platforms.some((p) => !p.oneWay && !p.wall)).toBe(true);
      for (const modifier of MODIFIERS) {
        for (const doubleJump of [false, true]) {
          const w = new World(
            map,
            { ...modifier, doubleJump },
            [0, 1, 2, 3],
            0,
            90,
            [],
            "stress",
          );
          const rng = seededRandom("solid-stress");
          for (let i = 0; i < 900; i++) {
            w.tick(
              W.step,
              Object.fromEntries(
                w.players.map((p) => [
                  p.id,
                  {
                    left: rng() < 0.5,
                    right: rng() < 0.5,
                    jump: rng() < 0.09,
                    action: rng() < 0.1,
                  },
                ]),
              ),
            );
            for (const p of w.players)
              for (const deck of w.platforms.filter((d) => !d.oneWay)) {
                const overlapX =
                  Math.min(p.x + T.playerWidth / 2, deck.x + deck.w) -
                  Math.max(p.x - T.playerWidth / 2, deck.x);
                const overlapY =
                  Math.min(p.y, deck.y + (deck.h || 22)) -
                  Math.max(p.y - T.playerHeight, deck.y);
                expect(
                  overlapX > 0.01 && overlapY > 0.01,
                  JSON.stringify({
                    modifier: modifier.id,
                    doubleJump,
                    tick: i,
                    player: p,
                    deck,
                  }),
                ).toBe(false);
              }
          }
        }
      }
    },
  );
});

describe("permanent double jump", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("allows exactly one extra jump, resets on landing, and never expires", () => {
    const w = make([], true),
      p = w.players[0];
    w.time = 20;
    step(w, 1, { jump: true });
    step(w, 10);
    step(w, 1, { jump: true });
    expect(p.jumps).toBe(2);
    expect(p.vy).toBeLessThan(-1000);
    step(w, 1);
    const before = p.vy;
    step(w, 1, { jump: true });
    expect(p.vy).toBeGreaterThan(before);
    expect(p.jumps).toBe(2);
    step(w, 180);
    expect(p.ground).toBe(0);
    expect(w.active(p, "double")).toBe(true);
    step(w, 1, { jump: true });
    step(w, 1);
    step(w, 1, { jump: true });
    expect(p.jumps).toBe(2);
  });
  it("does not spawn redundant double-jump pickups", () => {
    const w = make([], true);
    w.enabled = ["double"];
    w.spawnPower();
    expect(w.pickups).toHaveLength(0);
  });
  it("low gravity and double jump respect the screen ceiling without respawning", () => {
    const w = make([], true),
      p = w.players[0];
    w.modifier.gravity = 0.6;
    Object.assign(p, { x: 500, y: 80, ground: -1, vy: -1000 });
    step(w, 15);
    expect(p.x).toBe(500);
    expect(p.y).toBeGreaterThanOrEqual(T.playerHeight);
    expect(p.y).toBeLessThan(100);
  });
  it("defaults off and persists the user's choice", () => {
    let value: string | null = null;
    vi.stubGlobal("localStorage", {
      getItem: () => value,
      setItem: (_key: string, s: string) => {
        value = s;
      },
    });
    expect(loadSettings().permanentDoubleJump).toBe(false);
    saveSettings({ ...defaults(), permanentDoubleJump: true });
    expect(loadSettings().permanentDoubleJump).toBe(true);
  });
});
