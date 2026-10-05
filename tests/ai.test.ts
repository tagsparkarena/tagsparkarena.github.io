import { describe, expect, it } from "vitest";
import { AiOpponent, AI_LEVELS } from "../src/ai";
import { World, idle } from "../src/engine";
import { MAPS, MODIFIERS } from "../src/maps";
import { WORLD, TUNING, type AiDifficulty } from "../src/config";
import { defaults, loadSettings } from "../src/storage";

const make = (map = MAPS[0]) =>
  new World(
    map,
    { ...MODIFIERS[0], doubleJump: true },
    [0, 1],
    1,
    30,
    ["speed", "shield", "super"],
    "solo-test",
  );
describe("solo AI", () => {
  it("replans when the runner moves to another upper platform", () => {
    const w = make();
    w.enabled = [];
    const decks = w.platforms
      .filter((p) => p.index > 0 && !p.wall)
      .sort((a, b) => a.y - b.y);
    const runner = w.players[0];
    Object.assign(runner, {
      x: decks[0].x + decks[0].w / 2,
      y: decks[0].y,
      ground: decks[0].index,
    });
    const ai = new AiOpponent(1, "hard", "retarget");
    for (let i = 0; i < 120; i++)
      w.tick(WORLD.step, { 0: idle, 1: ai.read(w) });
    Object.assign(runner, {
      x: decks[1].x + decks[1].w / 2,
      y: decks[1].y,
      ground: decks[1].index,
      vx: 0,
      vy: 0,
    });
    for (let i = 0; i < 120 * 20 && w.it === 1; i++)
      w.tick(WORLD.step, { 0: idle, 1: ai.read(w) });
    expect(w.players[1].tags).toBeGreaterThan(0);
  });
  it.each(
    MAPS.flatMap((map) =>
      (["easy", "medium", "hard"] as AiDifficulty[]).map((difficulty) => ({
        map,
        difficulty,
      })),
    ),
  )(
    "$difficulty finds a complete route to the highest deck of $map.name",
    ({ map, difficulty }) => {
      const w = make(map);
      w.duration = w.remaining = 45;
      w.enabled = [];
      const deck = w.platforms
        .filter((p) => p.index > 0 && !p.wall)
        .sort((a, b) => a.y - b.y)[0];
      w.players[0].x = deck.x + deck.w / 2;
      w.players[0].y = deck.y;
      w.players[0].ground = deck.index;
      const ai = new AiOpponent(1, difficulty, "upper-route");
      for (let i = 0; i < 120 * 40 && w.it === 1; i++)
        w.tick(WORLD.step, { 0: idle, 1: ai.read(w) });
      expect(
        w.players[1].tags,
        `${map.id}: AI ${w.players[1].x},${w.players[1].y}; target ${w.players[0].x},${w.players[0].y}`,
      ).toBeGreaterThan(0);
    },
    20000,
  );
  it.each(MAPS)(
    "reaches the highest deck of $name with double jump disabled",
    (map) => {
      const w = make(map);
      w.modifier.doubleJump = false;
      w.duration = w.remaining = 45;
      w.enabled = [];
      const deck = w.platforms
        .filter((p) => p.index > 0 && !p.wall)
        .sort((a, b) => a.y - b.y)[0];
      Object.assign(w.players[0], {
        x: deck.x + deck.w / 2,
        y: deck.y,
        ground: deck.index,
      });
      const ai = new AiOpponent(1, "hard", "single-jump-route");
      for (let i = 0; i < 120 * 40 && w.it === 1; i++) {
        w.tick(WORLD.step, { 0: idle, 1: ai.read(w) });
        expect(w.players[1].jumps).toBeLessThanOrEqual(1);
      }
      expect(
        w.players[1].tags,
        `${map.id}: AI ${w.players[1].x},${w.players[1].y}`,
      ).toBeGreaterThan(0);
    },
    20000,
  );
  it.each(["easy", "medium", "hard"] as AiDifficulty[])(
    "%s keeps pursuing outside its planning horizon on an open floor",
    (difficulty) => {
      const w = make({ ...MAPS[0], platforms: [] });
      w.players[1].x = 1200;
      w.players[0].x = 100;
      const ai = new AiOpponent(1, difficulty, "long-chase");
      for (let i = 0; i < 120 && w.it === 1; i++) {
        const input = ai.read(w);
        expect(input.left || input.right || input.jump || input.action).toBe(
          true,
        );
        w.tick(WORLD.step, { 0: idle, 1: input });
      }
      expect(w.players[1].x).toBeLessThan(800);
    },
  );
  it.each(["easy", "medium", "hard"] as AiDifficulty[])(
    "%s keeps chasing a distant runner below a solid shelf",
    (difficulty) => {
      const w = make();
      const shelf = w.platforms.find(
        (p) => !p.oneWay && !p.wall && p.index > 0 && p.y < 500,
      )!;
      const bot = w.players[1];
      bot.x = shelf.x + shelf.w / 2;
      bot.y = shelf.y;
      bot.ground = shelf.index;
      w.players[0].x = bot.x;
      const ai = new AiOpponent(1, difficulty, "distant-runner");
      const input = ai.read(w);
      expect(input.left || input.right || input.jump || input.action).toBe(
        true,
      );
      for (let i = 0; i < 120 * 20 && w.it === 1; i++)
        w.tick(WORLD.step, { 0: idle, 1: ai.read(w) });
      expect(bot.tags).toBeGreaterThan(0);
    },
  );
  it("plans without changing live physics, stats, events or random state", () => {
    const w = make();
    const before = JSON.stringify(w);
    const ai = new AiOpponent(1, "hard", "test");
    ai.read(w);
    expect(JSON.stringify(w)).toBe(before);
    const control = make();
    expect(w.random()).toBe(control.random());
  });
  it.each(["easy", "medium", "hard"] as AiDifficulty[])(
    "%s chases and tags a stationary player",
    (difficulty) => {
      const w = make();
      const ai = new AiOpponent(1, difficulty, "test");
      for (let i = 0; i < 120 * 15 && w.it === 1; i++)
        w.tick(WORLD.step, { 0: idle, 1: ai.read(w) });
      expect(w.players[1].tags).toBeGreaterThan(0);
    },
  );
  it("runs away when the human is It", () => {
    const w = make();
    w.it = 0;
    w.players[0].x = 600;
    w.players[1].x = 800;
    const ai = new AiOpponent(1, "hard", "test");
    const input = ai.read(w);
    expect(input.right).toBe(true);
    expect(input.left).toBe(false);
  });
  it.each(MAPS)("can reach a stationary runner on $name", (map) => {
    const w = make(map);
    const ai = new AiOpponent(1, "hard", "route-test");
    for (let i = 0; i < 120 * 25 && w.it === 1; i++)
      w.tick(WORLD.step, { 0: idle, 1: ai.read(w) });
    expect(
      w.players[1].tags,
      JSON.stringify({ players: w.players, ai }),
    ).toBeGreaterThan(0);
  });
  it("climbs to an elevated runner rather than pushing into a solid underside", () => {
    const w = make();
    const deck = w.platforms.find((p) => p.index > 0 && !p.oneWay && !p.wall)!;
    w.players[0].x = deck.x + deck.w / 2;
    w.players[0].y = deck.y;
    w.players[0].ground = deck.index;
    const ai = new AiOpponent(1, "hard", "climb-test");
    let highest = WORLD.floor;
    for (let i = 0; i < 120 * 15 && w.it === 1; i++) {
      w.tick(WORLD.step, { 0: idle, 1: ai.read(w) });
      highest = Math.min(highest, w.players[1].y);
    }
    expect(highest).toBeLessThan(deck.y + 40);
    expect(w.players[1].tags).toBeGreaterThan(0);
  });
  it("has progressively faster reactions and longer planning", () => {
    expect(AI_LEVELS.easy.reaction).toBeGreaterThan(AI_LEVELS.medium.reaction);
    expect(AI_LEVELS.medium.reaction).toBeGreaterThan(AI_LEVELS.hard.reaction);
    expect(AI_LEVELS.easy.horizon).toBeLessThan(AI_LEVELS.hard.horizon);
  });
  it.each(MAPS)(
    "navigates $name without invalid positions or changing movement rules",
    (map) => {
      const w = make(map);
      const ai = new AiOpponent(1, "medium", "map-test");
      let distance = 0;
      let x = w.players[1].x;
      for (let i = 0; i < 120 * 10; i++) {
        w.tick(WORLD.step, { 0: idle, 1: ai.read(w) });
        const p = w.players[1];
        distance += Math.abs(p.x - x);
        x = p.x;
        expect(Number.isFinite(p.x + p.y)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(18);
        expect(p.x).toBeLessThanOrEqual(WORLD.width - 18);
        expect(p.y).toBeLessThanOrEqual(WORLD.floor);
        expect(w.speed(p)).toBeLessThanOrEqual(
          TUNING.speed * TUNING.speedMultiplier * (1 + TUNING.catchupCap),
        );
      }
      expect(distance).toBeGreaterThan(200);
    },
  );
  it("uses safe defaults and validates persisted difficulty", () => {
    expect(defaults().mode).toBe("local");
    expect(defaults().aiDifficulty).toBe("medium");
    const values = new Map<string, string>();
    const previous = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: (key: string) => values.get(key) || null },
    });
    try {
      values.set(
        "tagspark-v1",
        JSON.stringify({ mode: "solo", aiDifficulty: "hard" }),
      );
      expect(loadSettings()).toMatchObject({
        mode: "solo",
        aiDifficulty: "hard",
      });
      values.set(
        "tagspark-v1",
        JSON.stringify({ mode: "invalid", aiDifficulty: "impossible" }),
      );
      expect(loadSettings()).toMatchObject({
        mode: "local",
        aiDifficulty: "medium",
      });
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previous,
      });
    }
  });
  it("stops producing input after the round ends", () => {
    const w = make();
    w.ended = true;
    expect(new AiOpponent(1, "hard", "test").read(w)).toEqual(idle);
  });
});
