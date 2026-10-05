import { WORLD, type AiDifficulty } from "./config";
import { World, idle, type Input, type Player } from "./engine";

interface Node {
  player: Player;
  time: number;
  platforms: number[];
  parent?: Node;
  input: Input;
  priority: number;
}
interface Leg {
  input: Input;
  until: number;
  expected: Player;
}
const frames = 24;
const stepTime = frames * WORLD.step;
const copyPlayer = (p: Player): Player => ({
  ...p,
  buffs: { ...p.buffs },
  pickups: { ...p.pickups },
});

// A small binary heap keeps route searches bounded without sorting the frontier.
class Frontier {
  nodes: Node[] = [];
  push(node: Node) {
    let i = this.nodes.length;
    this.nodes.push(node);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.nodes[parent].priority <= node.priority) break;
      this.nodes[i] = this.nodes[parent];
      i = parent;
    }
    this.nodes[i] = node;
  }
  pop(): Node | undefined {
    const result = this.nodes[0];
    const last = this.nodes.pop();
    if (!last || !this.nodes.length) return result;
    let i = 0;
    while (i * 2 + 1 < this.nodes.length) {
      let child = i * 2 + 1;
      if (
        child + 1 < this.nodes.length &&
        this.nodes[child + 1].priority < this.nodes[child].priority
      )
        child++;
      if (last.priority <= this.nodes[child].priority) break;
      this.nodes[i] = this.nodes[child];
      i = child;
    }
    this.nodes[i] = last;
    return result;
  }
}

/** Searches several jumps ahead using the game's actual physics, including
 * solid ceilings, walls, one-way decks, double jumps and moving platforms.
 * The resulting input sequence is committed until the runner changes course
 * or an actual landing differs from the prediction.
 */
export class PursuitNavigation {
  private route: Leg[] = [];
  private goal = { x: -9999, y: -9999 };
  private retryAt = 0;
  private checkTargetAt = 0;
  private buffKey = "";
  constructor(
    private id: number,
    private difficulty: AiDifficulty,
  ) {}

  reset() {
    this.route = [];
    this.retryAt = 0;
    this.goal.x = -9999;
  }

  read(world: World, target: Player): Input {
    const me = world.players.find((p) => p.id === this.id)!;
    while (
      this.route.length &&
      world.time >= this.route[0].until - WORLD.step / 2
    ) {
      const leg = this.route.shift()!;
      if (Math.hypot(me.x - leg.expected.x, me.y - leg.expected.y) > 22) {
        this.route = [];
        break;
      }
    }
    const buffs = `${me.buffs.speed}:${me.buffs.super}`;
    if (buffs !== this.buffKey) {
      this.route = [];
      this.buffKey = buffs;
    }
    if (world.time >= this.checkTargetAt) {
      this.checkTargetAt =
        world.time + { easy: 0.7, medium: 0.4, hard: 0.2 }[this.difficulty];
      if (Math.hypot(target.x - this.goal.x, target.y - this.goal.y) > 100)
        this.route = [];
    }
    if (!this.route.length && world.time >= this.retryAt) {
      this.goal = { x: target.x, y: target.y };
      this.route = this.search(world, me, this.goal);
      this.retryAt = world.time + 0.2;
    }
    return (
      this.route[0]?.input || {
        ...idle,
        left: target.x < me.x - 12,
        right: target.x > me.x + 12,
        action: target.y > me.y + 40,
      }
    );
  }

  private search(
    world: World,
    me: Player,
    goal: { x: number; y: number },
  ): Leg[] {
    const sim = new World(
      world.map,
      world.modifier,
      world.players.map((p) => p.id),
      me.id,
      world.time + 100,
      [],
      "route",
    );
    sim.platforms = world.platforms.map((p) => ({ ...p }));
    sim.players = [copyPlayer(me)];
    sim.lastTag = world.lastTag;
    sim.nextPower = Infinity;
    sim.tagLockedUntil = Infinity;
    const heuristic = (p: Player) =>
      Math.hypot(p.x - goal.x, (p.y - goal.y) * 1.7) / 600;
    const key = (p: Player) =>
      `${Math.round(p.x / 28)},${Math.round(p.y / 24)},${Math.round(p.vx / 240)},${Math.round(p.vy / 350)},${p.ground},${p.jumps},${+p.prevJump}`;
    const root: Node = {
      player: copyPlayer(me),
      time: world.time,
      platforms: world.platforms.map((p) => p.x),
      input: idle,
      priority: heuristic(me),
    };
    const queue = new Frontier();
    queue.push(root);
    const seen = new Map<string, number>([[key(me), 0]]);
    let best = root;
    let closest = heuristic(me);
    for (let expanded = 0; expanded < 2500 && queue.nodes.length; expanded++) {
      const node = queue.pop()!;
      const p = node.player;
      if (Math.abs(p.x - goal.x) < 25 && Math.abs(p.y - goal.y) < 30) {
        best = node;
        break;
      }
      if (node.time - world.time > 8) continue;
      const canJump =
        p.ground >= 0 ||
        p.prevJump ||
        (world.modifier.doubleJump && p.jumps < 2);
      for (const direction of [-1, 0, 1]) {
        for (const jump of canJump ? [false, true] : [false]) {
          for (const drop of !jump &&
          p.ground > 0 &&
          world.platforms[p.ground].oneWay
            ? [false, true]
            : [false]) {
            const input: Input = {
              left: direction < 0,
              right: direction > 0,
              jump,
              action: drop,
            };
            sim.time = node.time;
            sim.remaining = sim.duration - sim.time;
            sim.ended = false;
            sim.players[0] = copyPlayer(p);
            sim.platforms.forEach((platform, i) => {
              platform.x = node.platforms[i];
            });
            for (let frame = 0; frame < frames; frame++)
              sim.tick(WORLD.step, { [me.id]: input });
            sim.events.length = 0;
            const next = sim.players[0];
            const cost = node.time - world.time + stepTime;
            const state = key(next);
            if ((seen.get(state) ?? Infinity) <= cost + 0.0001) continue;
            seen.set(state, cost);
            const h = heuristic(next);
            const child: Node = {
              player: next,
              platforms: sim.platforms.map((platform) => platform.x),
              time: node.time + stepTime,
              parent: node,
              input,
              priority: cost + h * 2,
            };
            if (h < closest) {
              closest = h;
              best = child;
            }
            queue.push(child);
          }
        }
      }
    }
    const route: Leg[] = [];
    for (let node = best; node.parent; node = node.parent)
      route.push({
        input: node.input,
        until: node.time,
        expected: node.player,
      });
    return route.reverse();
  }
}
