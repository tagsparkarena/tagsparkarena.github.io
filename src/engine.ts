import { TUNING as T, WORLD as W, type PowerKind } from "./config";
import {
  MAPS,
  MODIFIERS,
  type ArenaMap,
  type Modifier,
  type Platform,
} from "./maps";
export function seededRandom(seed: string) {
  let h = 2166136261;
  for (const c of seed) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function selectRound(
  seed: string,
  round: number,
  mapIds: string[],
  modIds: string[],
  players: number[],
) {
  const rng = seededRandom(`${seed}:${round}`);
  const maps = MAPS.filter((m) => mapIds.includes(m.id));
  const mods = MODIFIERS.filter((m) => modIds.includes(m.id));
  if (!players.length || !maps.length)
    throw new Error("Select players and at least one map.");
  const start = Math.floor(seededRandom(seed)() * players.length);
  return {
    map: maps[Math.floor(rng() * maps.length)],
    modifier: mods[Math.floor(rng() * mods.length)] || MODIFIERS[0],
    it: players[(start + round) % players.length],
  };
}
export interface Player {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ground: number;
  lastGround: number;
  jumpBuffer: number;
  jumps: number;
  prevJump: boolean;
  dropUntil: number;
  portalUntil: number;
  safeUntil: number;
  shieldReady: number;
  buffs: Record<PowerKind, number>;
  itTime: number;
  tags: number;
  pickups: Record<PowerKind, number>;
  facing: number;
}
export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
  action: boolean;
}
export const idle: Input = {
  left: false,
  right: false,
  jump: false,
  action: false,
};
export interface LivePlatform extends Platform {
  baseX: number;
  lastX: number;
  dx: number;
  index: number;
}
export interface Pickup {
  id: number;
  kind: PowerKind;
  x: number;
  y: number;
  ready: number;
  expires: number;
}
export type GameEvent = {
  type: "jump" | "land" | "tag" | "pickup" | "spawn" | "portal";
  x: number;
  y: number;
  player: number;
  kind?: PowerKind;
};
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const approach = (a: number, b: number, d: number) =>
  a < b ? Math.min(a + d, b) : Math.max(a - d, b);
export function surface(p: Platform, x: number) {
  return p.y + (p.slope || 0) * clamp((x - p.x) / p.w, 0, 1);
}
export class World {
  players: Player[];
  platforms: LivePlatform[];
  pickups: Pickup[] = [];
  events: GameEvent[] = [];
  time = 0;
  remaining: number;
  it: number;
  tagLockedUntil = T.spawnProtection;
  lastTag = 0;
  ended = false;
  nextPower = 3;
  nextId = 1;
  random: () => number;
  constructor(
    public map: ArenaMap,
    public modifier: Modifier,
    ids: number[],
    it: number,
    public duration: number,
    public enabled: PowerKind[],
    seed: string,
  ) {
    if (
      ids.length < 2 ||
      ids.length > 4 ||
      new Set(ids).size !== ids.length ||
      !ids.includes(it)
    )
      throw new Error("A round needs 2–4 distinct players and a valid It.");
    this.it = it;
    this.remaining = duration;
    this.random = seededRandom(seed);
    this.platforms = [
      { x: 0, y: W.floor, w: W.width, h: 30 },
      ...map.platforms,
    ].map((p, i) => ({ ...p, baseX: p.x, lastX: p.x, dx: 0, index: i }));
    this.players = ids.map((id, i) => ({
      id,
      x: map.spawns[i],
      y: W.floor,
      vx: 0,
      vy: 0,
      ground: 0,
      lastGround: 0,
      jumpBuffer: -99,
      jumps: 0,
      prevJump: false,
      dropUntil: 0,
      portalUntil: 0,
      safeUntil: T.spawnProtection,
      shieldReady: 0,
      buffs: { speed: 0, shield: 0, super: 0 },
      itTime: 0,
      tags: 0,
      pickups: { speed: 0, shield: 0, super: 0 },
      facing: i % 2 ? -1 : 1,
    }));
  }
  active(p: Player, k: PowerKind) {
    return p.buffs[k] > this.time;
  }
  speed(p: Player) {
    const bonus =
      p.id === this.it
        ? clamp(
            (this.time - this.lastTag - T.catchupAfter) / T.catchupRamp,
            0,
            1,
          ) * T.catchupCap
        : 0;
    return (
      T.speed *
      (this.modifier.speed || 1) *
      (this.active(p, "speed") ? T.speedMultiplier : 1) *
      (1 + bonus)
    );
  }
  tick(dt: number, inputs: Record<number, Input>) {
    if (this.ended) return;
    dt = Math.min(dt, this.remaining);
    this.time += dt;
    this.remaining = Math.max(0, this.duration - this.time);
    this.players.find((p) => p.id === this.it)!.itTime += dt;
    for (const p of this.platforms) {
      p.lastX = p.x;
      const amp =
        p.move || (this.modifier.moving && p.oneWay && !p.wall ? 35 : 0);
      p.x =
        p.baseX +
        Math.sin(
          this.time * (this.modifier.moving ? 1.65 : 0.7) + (p.phase || 0),
        ) *
          amp;
      p.dx = p.x - p.lastX;
    }
    for (const p of this.players) this.move(p, inputs[p.id] || idle, dt);
    // Expiry wins over contacts at the exact buzzer. There are no tags after time runs out.
    if (this.remaining <= 1e-7) {
      this.remaining = 0;
      this.ended = true;
      return;
    }
    for (const p of this.players) {
      for (const item of [...this.pickups])
        if (
          item.ready <= this.time &&
          Math.abs(p.x - item.x) < 32 &&
          Math.abs(p.y - 22 - item.y) < 40
        ) {
          if (this.collect(p, item)) {
            this.pickups = this.pickups.filter((i) => i.id !== item.id);
          }
        }
    }
    const tagger = this.players.find((p) => p.id === this.it)!;
    if (this.time >= this.tagLockedUntil) {
      const target = this.players.find(
        (p) =>
          p.id !== this.it &&
          p.safeUntil <= this.time &&
          !this.active(p, "shield") &&
          Math.abs(p.x - tagger.x) < T.playerWidth &&
          Math.abs(p.y - tagger.y) < T.playerHeight,
      );
      if (target) this.tag(tagger, target);
    }
    this.pickups = this.pickups.filter((p) => p.expires > this.time);
    if (this.time >= this.nextPower) {
      this.spawnPower();
      this.nextPower = this.time + T.powerInterval * (this.modifier.spawn || 1);
    }
  }
  private move(p: Player, input: Input, dt: number) {
    if (p.ground >= 0) {
      const platform = this.platforms[p.ground];
      p.x += platform.dx;
      p.lastGround = this.time;
      p.jumps = 0;
    }
    if (input.jump && !p.prevJump) p.jumpBuffer = this.time;
    const canGround = p.ground >= 0 || this.time - p.lastGround < T.coyote;
    if (
      p.jumpBuffer > this.time - T.buffer &&
      (canGround || (this.modifier.doubleJump && p.jumps < 2))
    ) {
      p.vy =
        -T.jump *
        (this.modifier.jump || 1) *
        (this.active(p, "super") ? T.superJumpMultiplier : 1);
      p.jumps = canGround ? 1 : 2;
      p.ground = -1;
      p.lastGround = -99;
      p.jumpBuffer = -99;
      this.events.push({ type: "jump", x: p.x, y: p.y, player: p.id });
    }
    // A tap still clears a platform tier; holding adds a little extra height.
    if (!input.jump && p.prevJump && p.vy < -200)
      p.vy *= T.jumpReleaseMultiplier;
    p.prevJump = input.jump;
    if (input.action && p.ground > 0 && this.platforms[p.ground].oneWay) {
      p.dropUntil = this.time + 0.2;
      p.ground = -1;
      p.lastGround = -99;
    }
    const axis = Number(input.right) - Number(input.left);
    if (axis) p.facing = axis;
    const ice = p.ground >= 0 && this.platforms[p.ground].ice ? 0.24 : 1;
    const accel =
      p.ground >= 0
        ? T.acceleration * (this.modifier.friction || ice)
        : T.airAcceleration;
    p.vx = axis
      ? approach(
          p.vx,
          axis * this.speed(p),
          accel * (p.vx * axis < 0 ? T.turnMultiplier : 1) * dt,
        )
      : approach(
          p.vx,
          0,
          (p.ground >= 0 ? T.friction * (this.modifier.friction || ice) : 220) *
            dt,
        );
    const previousX = p.x,
      previousY = p.y,
      previousGround = p.ground;
    p.x += p.vx * dt;
    const half = T.playerWidth / 2;
    // Sweep horizontally against solid faces; one-way decks never block sides.
    for (const platform of this.platforms) {
      if (platform.oneWay || platform.index === 0) continue;
      const bottom = platform.y + (platform.h || 22);
      if (p.y <= platform.y || p.y - T.playerHeight >= bottom) continue;
      if (previousX + half <= platform.x && p.x + half > platform.x) {
        p.x = platform.x - half;
        p.vx = 0;
      } else if (
        previousX - half >= platform.x + platform.w &&
        p.x - half < platform.x + platform.w
      ) {
        p.x = platform.x + platform.w + half;
        p.vx = 0;
      }
    }
    p.vy = Math.min(
      T.maxFall,
      p.vy + T.gravity * (this.modifier.gravity || 1) * dt,
    );
    p.y += p.vy * dt;
    p.ground = -1;
    if (p.vy < 0) {
      // Solid undersides stop jumps, including powered and permanent double jumps.
      let ceiling = -Infinity;
      for (const platform of this.platforms) {
        if (platform.oneWay || platform.index === 0) continue;
        const bottom = platform.y + (platform.h || 22);
        if (p.x + half <= platform.x || p.x - half >= platform.x + platform.w)
          continue;
        if (
          previousY - T.playerHeight >= bottom &&
          p.y - T.playerHeight <= bottom
        )
          ceiling = Math.max(ceiling, bottom);
      }
      if (ceiling !== -Infinity) {
        p.y = ceiling + T.playerHeight;
        p.vy = 0;
      }
    }
    if (p.vy >= 0) {
      let bestY = Infinity;
      let best: LivePlatform | undefined;
      for (const platform of this.platforms) {
        if (p.x + half <= platform.x || p.x - half >= platform.x + platform.w)
          continue;
        // Holding drop bypasses every raised platform without resetting fall speed.
        // The arena floor always remains solid; releasing restores normal landings.
        if (platform.oneWay && (input.action || this.time < p.dropUntil))
          continue;
        const top = surface(platform, p.x);
        const onSlope = previousGround === platform.index && !!platform.slope;
        if (
          (previousY <=
            top +
              Math.abs(p.vx * dt) *
                (Math.abs(platform.slope || 0) / platform.w) +
              3 ||
            onSlope) &&
          p.y >= top - 2 &&
          top < bestY
        ) {
          bestY = top;
          best = platform;
        }
      }
      if (best) {
        p.y = bestY;
        p.ground = best.index;
        p.lastGround = this.time;
        p.jumps = 0;
        if (best.bounce) {
          p.vy = -T.jump * 1.38;
          p.ground = -1;
          p.lastGround = -99;
          p.jumps = 1;
          this.events.push({ type: "jump", x: p.x, y: p.y, player: p.id });
        } else {
          if (p.vy > 200 && previousGround < 0)
            this.events.push({ type: "land", x: p.x, y: p.y, player: p.id });
          p.vy = 0;
        }
      }
    }
    // The top of the shared screen is a boundary, not a respawn trigger.
    if (p.y < T.playerHeight) {
      p.y = T.playerHeight;
      p.vy = Math.max(0, p.vy);
    }
    if (
      this.map.portals &&
      this.time > p.portalUntil &&
      p.y > W.floor - 140 &&
      (p.x < 22 || p.x > W.width - 22)
    ) {
      p.x = p.x < 22 ? W.width - 45 : 45;
      p.portalUntil = this.time + 1;
      this.events.push({ type: "portal", x: p.x, y: p.y, player: p.id });
    }
    p.x = clamp(p.x, 18, W.width - 18);
    if (!Number.isFinite(p.x + p.y) || p.y > W.height + 100 || p.y < -250) {
      this.respawn(p);
    }
  }
  respawn(p: Player) {
    const others = this.players.filter((q) => q.id !== p.id);
    p.x = [...this.map.spawns].sort(
      (a, b) =>
        Math.min(...others.map((q) => Math.abs(q.x - b))) -
        Math.min(...others.map((q) => Math.abs(q.x - a))),
    )[0];
    p.y = W.floor;
    p.vx = p.vy = 0;
    p.ground = 0;
    p.safeUntil = this.time + 0.7;
    p.buffs = { speed: 0, shield: 0, super: 0 };
  }
  tag(from: Player, to: Player) {
    if (
      this.ended ||
      this.time < this.tagLockedUntil ||
      this.active(to, "shield") ||
      to.safeUntil > this.time
    )
      return false;
    this.it = to.id;
    from.tags++;
    this.lastTag = this.time;
    this.tagLockedUntil = this.time + T.tagLock;
    const dir = to.x >= from.x ? 1 : -1;
    to.vx = dir * 180;
    from.vx = -dir * 140;
    // Velocity separation is collision-resolved next tick; never teleport into a wall.
    this.events.push({ type: "tag", x: to.x, y: to.y - 20, player: to.id });
    return true;
  }
  collect(p: Player, item: Pickup) {
    if (
      item.kind === "shield" &&
      (p.id === this.it || p.shieldReady > this.time)
    )
      return false;
    p.buffs[item.kind] =
      this.time +
      (item.kind === "speed"
        ? T.speedDuration
        : item.kind === "shield"
          ? T.shieldDuration
          : T.superDuration);
    if (item.kind === "shield")
      p.shieldReady = this.time + T.shieldDuration + T.shieldCooldown;
    p.pickups[item.kind]++;
    this.events.push({
      type: "pickup",
      x: p.x,
      y: p.y - 25,
      player: p.id,
      kind: item.kind,
    });
    return true;
  }
  spawnPower() {
    const enabled = this.enabled;
    if (!enabled.length || this.pickups.length >= T.maxPowers) return;
    const candidates = this.platforms
      .filter((p) => !p.bounce && !p.move && !p.slope && !p.wall)
      .map((p) => ({ x: p.x + p.w / 2, y: p.y - 28 }))
      .filter(
        (c) =>
          this.players.every(
            (p) => Math.hypot(p.x - c.x, p.y - 20 - c.y) > 80,
          ) &&
          this.pickups.every((p) => Math.hypot(p.x - c.x, p.y - c.y) > 80) &&
          !this.platforms.some(
            (p) =>
              !p.oneWay &&
              c.x + 24 > p.x &&
              c.x - 24 < p.x + p.w &&
              c.y + 24 > p.y &&
              c.y - 24 < p.y + (p.h || 22),
          ),
      );
    if (!candidates.length) return;
    const pos = candidates[Math.floor(this.random() * candidates.length)];
    const kind = enabled[Math.floor(this.random() * enabled.length)];
    this.pickups.push({
      id: this.nextId++,
      kind,
      ...pos,
      ready: this.time + T.powerWarning,
      expires: this.time + T.powerWarning + T.powerLifetime,
    });
  }
}
export interface Score {
  id: number;
  wins: number;
  itTime: number;
  tags: number;
  pickups: number;
}
export function scoreRound(scores: Score[], world: World) {
  if (!world.ended) throw new Error("Round has not ended.");
  return scores.map((s) => {
    const p = world.players.find((p) => p.id === s.id)!;
    return {
      ...s,
      wins: s.wins + (s.id === world.it ? 0 : 1),
      itTime: s.itTime + p.itTime,
      tags: s.tags + p.tags,
      pickups: s.pickups + Object.values(p.pickups).reduce((a, b) => a + b, 0),
    };
  });
}
export function winners(scores: Score[]) {
  const max = Math.max(...scores.map((s) => s.wins));
  return scores.filter((s) => s.wins === max).map((s) => s.id);
}
