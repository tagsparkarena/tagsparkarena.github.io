import Phaser from "phaser";
import { PALETTES, POWER_INFO, WORLD as W } from "./config";
import { World, surface, type Input } from "./engine";
import type { Keyboard } from "./input";
import type { AudioPlayer } from "./audio";
export interface Session {
  world: World;
  keyboard: Keyboard;
  audio: AudioPlayer;
  paused: boolean;
  countdown: number;
  demo: boolean;
  reduced: boolean;
  onFrame: () => void;
  onEnd: () => void;
}
export function createGame(parent: HTMLElement, session: Session) {
  class ArenaScene extends Phaser.Scene {
    ink!: Phaser.GameObjects.Graphics;
    labels: Phaser.GameObjects.Text[] = [];
    powerLabels: Phaser.GameObjects.Text[] = [];
    itLabel!: Phaser.GameObjects.Text;
    acc = 0;
    uiTime = 0;
    ended = false;
    lastTick = -1;
    preload() {
      this.load.image(
        "pattern",
        `${import.meta.env.BASE_URL}assets/pattern_01.png`,
      );
    }
    create() {
      this.cameras.main.setBackgroundColor(session.world.map.sky);
      this.add
        .tileSprite(W.width / 2, W.height / 2, W.width, W.height, "pattern")
        .setAlpha(0.025);
      this.ink = this.add.graphics();
      this.labels = session.world.players.map((p) =>
        this.add
          .text(p.x, p.y, `P${p.id + 1} ${PALETTES[p.id].symbol}`, {
            fontFamily: "Arial",
            fontSize: "17px",
            fontStyle: "bold",
            color: "#173544",
          })
          .setOrigin(0.5),
      );
      this.itLabel = this.add
        .text(0, 0, "IT ϟ", {
          fontFamily: "Arial",
          fontSize: "19px",
          fontStyle: "bold",
          color: "#ffffff",
          backgroundColor: "#173544",
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5);
      for (let i = 0; i < 3; i++)
        this.powerLabels.push(
          this.add
            .text(0, 0, "", {
              fontFamily: "Arial",
              fontSize: "22px",
              fontStyle: "bold",
              color: "#173544",
            })
            .setOrigin(0.5),
        );
      this.game.canvas.setAttribute(
        "aria-label",
        session.demo
          ? "Preview of the tag arena"
          : "TagSpark arena. Player status and remaining time appear above.",
      );
      this.game.canvas.setAttribute("role", "img");
    }
    update(_time: number, delta: number) {
      const world = session.world;
      if (!session.paused) {
        if (session.countdown > 0) {
          session.countdown = Math.max(0, session.countdown - delta / 1000);
          const t = Math.ceil(session.countdown);
          if (t !== this.lastTick) {
            this.lastTick = t;
            session.audio.effect("tick");
          }
          session.onFrame();
        } else {
          this.acc += Math.min(delta / 1000, 0.05);
          while (this.acc >= W.step) {
            let inputs = session.keyboard.read(world.players.map((p) => p.id));
            if (session.demo) {
              inputs = Object.fromEntries(
                world.players.map((p) => {
                  const phase = (world.time + p.id * 2) % 8;
                  return [
                    p.id,
                    {
                      left: phase > 4,
                      right: phase <= 4,
                      jump: (world.time + p.id * 0.7) % 1.7 < 0.12,
                      action: false,
                    } satisfies Input,
                  ];
                }),
              );
            }
            world.tick(W.step, inputs);
            this.acc -= W.step;
          }
        }
      }
      this.draw();
      for (const e of world.events.splice(0)) {
        if (!session.demo) session.audio.effect(e.type);
        if (
          !session.reduced &&
          ["jump", "tag", "pickup", "portal"].includes(e.type)
        ) {
          const color = e.type === "tag" ? 0xffffff : PALETTES[e.player].code;
          for (let i = 0; i < (e.type === "tag" ? 12 : 5); i++) {
            const dot = this.add.circle(e.x, e.y, 3, color);
            const angle = (i / 12) * Math.PI * 2;
            this.tweens.add({
              targets: dot,
              x: e.x + Math.cos(angle) * 45,
              y: e.y + Math.sin(angle) * 35,
              alpha: 0,
              scale: 0.3,
              duration: 350,
              onComplete: () => dot.destroy(),
            });
          }
        }
      }
      if (!session.demo) {
        this.uiTime += delta;
        if (this.uiTime > 80) {
          session.onFrame();
          this.uiTime = 0;
        }
        if (world.ended && !this.ended) {
          this.ended = true;
          session.onEnd();
        }
      }
    }
    draw() {
      const w = session.world,
        g = this.ink;
      g.clear();
      const ink = 0x173544;
      g.lineStyle(2, w.map.ground, 0.09);
      for (let i = 0; i < 8; i++)
        g.strokeCircle(90 + i * 185, W.height + 10, 140);
      g.fillStyle(w.map.ground, 0.045);
      g.fillRoundedRect(385, 72, 230, 100, 50);
      g.fillRoundedRect(65, 210, 180, 70, 35);
      g.fillRoundedRect(735, 200, 170, 70, 35);
      // Draw square wall joints behind decks so connected structures have no gaps.
      for (const p of [...w.platforms].sort(
        (a, b) => Number(!!b.wall) - Number(!!a.wall),
      )) {
        const h = p.h || 22;
        if (p.wall) {
          g.fillStyle(w.map.ground);
          g.fillRect(p.x, p.y - 2, p.w, h + 4);
          g.fillStyle(ink, 0.15);
          g.fillRect(p.x + p.w - 5, p.y, 5, h);
          continue;
        }
        const end = surface(p, p.x + p.w);
        g.fillStyle(ink, 0.12);
        if (p.slope) {
          g.fillPoints(
            [
              { x: p.x, y: p.y + 7 },
              { x: p.x + p.w, y: end + 7 },
              { x: p.x + p.w, y: W.floor + 15 },
              { x: p.x, y: W.floor + 15 },
            ],
            true,
          );
          g.fillStyle(w.map.ground);
          g.fillPoints(
            [
              { x: p.x, y: p.y },
              { x: p.x + p.w, y: end },
              { x: p.x + p.w, y: W.floor + 10 },
              { x: p.x, y: W.floor + 10 },
            ],
            true,
          );
          g.lineStyle(6, w.map.accent);
          g.lineBetween(p.x, p.y, p.x + p.w, end);
        } else {
          g.fillRoundedRect(p.x, p.y + 7, p.w, h, 6);
          g.fillStyle(p.oneWay ? 0x7dbbd0 : w.map.ground);
          g.fillRoundedRect(p.x, p.y, p.w, h, 6);
          g.fillStyle(p.oneWay ? 0xbfe9f4 : 0x173544, p.oneWay ? 1 : 0.3);
          g.fillRoundedRect(p.x, p.y, p.w, 7, 3);
          if (p.bounce) {
            g.lineStyle(2, ink, 0.5);
            for (let x = p.x + 10; x < p.x + p.w - 8; x += 15) {
              g.lineBetween(x, p.y + 17, x + 6, p.y + 10);
              g.lineBetween(x + 6, p.y + 10, x + 12, p.y + 17);
            }
          } else {
            g.fillStyle(0xffffff, p.oneWay ? 0.85 : 0.15);
            for (let x = p.x + 12; x < p.x + p.w - 10; x += 28)
              g.fillRect(x, p.y + 13, p.oneWay ? 14 : 9, p.oneWay ? 3 : 2);
          }
        }
      }
      if (w.map.portals) {
        g.lineStyle(5, 0x7865ca, 0.8);
        g.strokeEllipse(20, W.floor - 47, 25, 85);
        g.strokeEllipse(W.width - 20, W.floor - 47, 25, 85);
        g.lineStyle(2, 0xffffff, 0.8);
        g.strokeEllipse(20, W.floor - 47, 14, 66);
        g.strokeEllipse(W.width - 20, W.floor - 47, 14, 66);
      }
      this.powerLabels.forEach((t) => t.setVisible(false));
      w.pickups.forEach((item, i) => {
        const ready = item.ready <= w.time,
          pulse = session.reduced ? 0 : Math.sin(w.time * 3) * 3;
        g.lineStyle(2, POWER_INFO[item.kind].color, ready ? 1 : 0.4);
        g.strokeCircle(item.x, item.y + pulse, 24);
        g.fillStyle(POWER_INFO[item.kind].color, ready ? 1 : 0.15);
        g.fillRoundedRect(item.x - 17, item.y - 17 + pulse, 34, 34, 10);
        this.powerLabels[i]
          ?.setPosition(item.x, item.y + pulse)
          .setText(ready ? POWER_INFO[item.kind].icon : "·")
          .setVisible(true);
      });
      w.players.forEach((p, i) => {
        const isIt = p.id === w.it,
          col = PALETTES[p.id],
          x = p.x,
          y = p.y,
          motion = session.reduced
            ? 0
            : Math.sin(w.time * 18 + p.id) *
              Math.min(1, Math.abs(p.vx) / 200) *
              1.4;
        if (!session.reduced && (isIt || w.active(p, "speed"))) {
          for (let j = 1; j <= 3; j++) {
            g.fillStyle(col.code, 0.13 * (4 - j));
            g.fillCircle(x - p.facing * j * 10, y - 15, j * 2);
          }
        }
        g.fillStyle(ink, 0.1);
        g.fillEllipse(x, y + 3, 36, 8);
        if (isIt) {
          g.lineStyle(2, ink, 0.65);
          g.strokeCircle(
            x,
            y - 21,
            29 + (session.reduced ? 0 : Math.sin(w.time * 5) * 2),
          );
        }
        const stretch = p.vy < -100 && !session.reduced ? 3 : 0;
        g.fillStyle(ink);
        g.fillRoundedRect(
          x - 18,
          y - 42 + motion - stretch,
          36,
          42 + stretch,
          13,
        );
        g.fillStyle(col.code);
        g.fillRoundedRect(
          x - 16,
          y - 40 + motion - stretch,
          32,
          37 + stretch,
          11,
        );
        g.fillStyle(0xffffff, 0.27);
        g.fillRoundedRect(x - 12, y - 37 + motion - stretch, 18, 7, 4);
        g.fillStyle(ink);
        g.fillCircle(x - 6 + p.facing * 2, y - 25 + motion - stretch, 2.3);
        g.fillCircle(x + 6 + p.facing * 2, y - 25 + motion - stretch, 2.3);
        g.lineStyle(1.6, ink);
        g.lineBetween(x - 3, y - 17 + motion, x + 3, y - 17 + motion);
        g.fillStyle(ink, 0.4);
        g.fillRoundedRect(x - 12, y - 4, 8, 5, 2);
        g.fillRoundedRect(x + 4, y - 4, 8, 5, 2);
        if (w.active(p, "shield") || p.safeUntil > w.time) {
          const shield = w.active(p, "shield");
          g.fillStyle(0x70dbd9, 0.16);
          g.fillCircle(x, y - 21, 32);
          g.lineStyle(2, shield ? 0x168e99 : 0xffffff, 0.9);
          g.strokeCircle(x, y - 21, 32);
          if (shield && p.buffs.shield - w.time < 1) {
            g.lineStyle(2, 0xffffff);
            g.strokeCircle(x, y - 21, 35);
          }
        }
        if (w.active(p, "super")) {
          g.fillStyle(0x8861bd);
          g.fillTriangle(x - 6, y - 54, x, y - 61, x + 6, y - 54);
          g.fillRect(x - 2, y - 54, 4, 8);
        }
        this.labels[i]
          .setPosition(x, y + 16)
          .setText(`P${p.id + 1} ${col.symbol}`);
        if (isIt) this.itLabel.setPosition(x, y - 66);
      });
    }
  }
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W.width,
    height: W.height,
    backgroundColor: session.world.map.sky,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: ArenaScene,
    audio: { noAudio: true },
    render: { antialias: true, roundPixels: false },
    fps: { target: 60 },
    banner: false,
  });
}
