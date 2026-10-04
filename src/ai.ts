import { WORLD, type AiDifficulty } from "./config";
import { World, idle, seededRandom, type Input } from "./engine";
import { PursuitNavigation } from "./navigation";

export const AI_LEVELS = {
  easy: {
    reaction: 0.36,
    horizon: 0.6,
    description: "Slower reactions. Good for learning the controls.",
  },
  medium: {
    reaction: 0.24,
    horizon: 0.85,
    description: "Quicker reactions and better escapes.",
  },
  hard: {
    reaction: 0.16,
    horizon: 1.1,
    description: "Plans further ahead and reacts quickly.",
  },
} as const;

interface Plan {
  direction: number;
  jumps: number;
  drop: boolean;
}

/** Multistep pursuit routes and short-horizon escapes use the real collision engine.
 * No teleports, extra movement speed, input reading, or hidden power-ups.
 */
export class AiOpponent {
  private nextDecision = -1;
  private plannedAt = 0;
  private lastIt = -1;
  private plan: Plan = { direction: 0, jumps: 0, drop: false };
  private random: () => number;
  private navigation: PursuitNavigation;
  constructor(
    public id: number,
    public difficulty: AiDifficulty,
    seed: string,
  ) {
    this.random = seededRandom(`${seed}:ai:${id}`);
    this.navigation = new PursuitNavigation(id, difficulty);
  }

  read(world: World): Input {
    if (world.ended || !world.players.some((p) => p.id === this.id))
      return { ...idle };
    if (world.it === this.id) {
      if (this.lastIt !== world.it) this.navigation.reset();
      this.lastIt = world.it;
      const me = world.players.find((p) => p.id === this.id)!;
      const target = world.players
        .filter((p) => p.id !== this.id)
        .sort(
          (a, b) =>
            Math.hypot(a.x - me.x, a.y - me.y) -
            Math.hypot(b.x - me.x, b.y - me.y),
        )[0];
      return this.navigation.read(world, target);
    }
    if (world.time >= this.nextDecision || world.it !== this.lastIt) {
      this.plannedAt = world.time;
      this.lastIt = world.it;
      this.nextDecision = world.time + AI_LEVELS[this.difficulty].reaction;
      this.plan = this.escape(world);
    }
    return this.controls(this.plan, world.time - this.plannedAt);
  }

  private controls(plan: Plan, elapsed: number): Input {
    return {
      left: plan.direction < 0,
      right: plan.direction > 0,
      // Release between pulses so the real jump buffer can trigger a second jump.
      jump:
        plan.jumps > 0 &&
        (elapsed < 0.045 ||
          (plan.jumps === 2 && elapsed >= 0.1 && elapsed < 0.145)),
      action: plan.drop,
    };
  }

  private forecast(world: World): World {
    const copy = new World(
      world.map,
      world.modifier,
      world.players.map((p) => p.id),
      world.it,
      world.duration,
      [],
      "ai-forecast",
    );
    copy.players = world.players.map((p) => ({
      ...p,
      buffs: { ...p.buffs },
      pickups: { ...p.pickups },
    }));
    copy.platforms = world.platforms.map((p) => ({ ...p }));
    copy.time = world.time;
    copy.remaining = world.remaining;
    copy.lastTag = world.lastTag;
    copy.tagLockedUntil = world.tagLockedUntil;
    copy.nextPower = Infinity;
    return copy;
  }

  private escape(world: World): Plan {
    const me = world.players.find((p) => p.id === this.id)!;
    const enemy = world.players.find((p) => p.id === world.it)!;
    const level = AI_LEVELS[this.difficulty];
    const canDrop = world.platforms.some(
      (p) =>
        p.oneWay &&
        Math.abs(p.y - me.y) < 110 &&
        me.x >= p.x - 20 &&
        me.x <= p.x + p.w + 20,
    );
    const jumpOptions =
      world.modifier.doubleJump && this.difficulty !== "easy"
        ? [0, 1, 2]
        : [0, 1];
    let best = -Infinity;
    let chosen = this.plan;
    for (const direction of [-1, 0, 1]) {
      for (const jumps of jumpOptions) {
        for (const drop of canDrop ? [false, true] : [false]) {
          const plan = { direction, jumps, drop };
          const sim = this.forecast(world);
          const bot = sim.players.find((p) => p.id === this.id)!;
          const target = sim.players.find((p) => p.id === enemy.id)!;
          let nearest = Infinity;
          let caught = false;
          const dt = 1 / 60;
          for (let t = 0; t < level.horizon && !sim.ended; t += dt) {
            const inputs: Record<number, Input> = {};
            for (const p of sim.players) {
              // Predict current velocity only; never inspect the human's keys.
              inputs[p.id] = { ...idle, left: p.vx < -80, right: p.vx > 80 };
            }
            inputs[this.id] = this.controls(plan, t);
            sim.tick(dt, inputs);
            nearest = Math.min(
              nearest,
              Math.hypot(bot.x - target.x, bot.y - target.y),
            );
            caught ||= sim.it === this.id;
          }
          const distance = Math.hypot(
            bot.x - target.x,
            (bot.y - target.y) * 1.1,
          );
          // Avoid parking in corners while fleeing, and avoid repeatedly pushing
          // into a wall. Solid undersides/sides are accounted for by forecasts.
          const edge = Math.min(bot.x, WORLD.width - bot.x);
          const trapped =
            direction !== 0 && Math.abs(bot.x - me.x) < 18 ? 85 : 0;
          let value =
            distance * 0.65 +
            nearest * 0.55 -
            (caught ? 2400 : 0) -
            Math.max(0, 130 - edge) * 1.4;
          value -= trapped + jumps * 9 + (drop ? 4 : 0);
          if (direction === this.plan.direction) value += 8;
          // A small pickup preference, secondary to escaping the tagger.
          for (const pickup of world.pickups) {
            if (pickup.ready > world.time) continue;
            const gain =
              Math.hypot(me.x - pickup.x, me.y - 22 - pickup.y) -
              Math.hypot(bot.x - pickup.x, bot.y - 22 - pickup.y);
            value += Math.max(-30, Math.min(30, gain * 0.06));
          }
          if (this.difficulty === "easy") value += (this.random() - 0.5) * 120;
          if (value > best) {
            best = value;
            chosen = plan;
          }
        }
      }
    }
    return chosen;
  }
}
