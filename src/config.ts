export const WORLD = { width: 1400, height: 784, floor: 744, step: 1 / 120 };
export const TUNING = {
  speed: 600,
  acceleration: 11000,
  airAcceleration: 8500,
  turnMultiplier: 1.5,
  friction: 11000,
  gravity: 2800,
  jump: 1060,
  jumpReleaseMultiplier: 0.9,
  maxFall: 1450,
  coyote: 0.11,
  buffer: 0.12,
  tagLock: 1.25,
  spawnProtection: 2,
  catchupAfter: 9,
  catchupRamp: 12,
  catchupCap: 0.12,
  powerInterval: 7,
  powerLifetime: 13,
  powerWarning: 1.1,
  maxPowers: 3,
  speedDuration: 4,
  speedMultiplier: 1.35,
  shieldDuration: 3,
  shieldCooldown: 7,
  superDuration: 6,
  superJumpMultiplier: 1.3,
  playerWidth: 32,
  playerHeight: 40,
};
export const PALETTES = [
  {
    name: "Mint",
    color: "#67d5ad",
    dark: "#157252",
    symbol: "●",
    code: 0x67d5ad,
  },
  {
    name: "Peach",
    color: "#ff9b7d",
    dark: "#ae442b",
    symbol: "▲",
    code: 0xff9b7d,
  },
  {
    name: "Sunny",
    color: "#ffd362",
    dark: "#906609",
    symbol: "◆",
    code: 0xffd362,
  },
  {
    name: "Sky",
    color: "#90b8ff",
    dark: "#345cb0",
    symbol: "■",
    code: 0x90b8ff,
  },
];
export interface Controls {
  left: string;
  right: string;
  jump: string;
  action: string;
}
export const DEFAULT_CONTROLS: Controls[] = [
  { left: "KeyA", right: "KeyD", jump: "KeyW", action: "KeyS" },
  {
    left: "ArrowLeft",
    right: "ArrowRight",
    jump: "ArrowUp",
    action: "ArrowDown",
  },
  { left: "KeyF", right: "KeyH", jump: "KeyT", action: "KeyG" },
  { left: "KeyJ", right: "KeyL", jump: "KeyI", action: "KeyK" },
];
export type PowerKind = "speed" | "shield" | "super";
export const POWER_INFO: Record<
  PowerKind,
  { name: string; icon: string; color: number; description: string }
> = {
  speed: {
    name: "Speed Burst",
    icon: "ϟ",
    color: 0xffcf5c,
    description: "35% faster movement for 4 seconds.",
  },
  shield: {
    name: "Invincibility Shield",
    icon: "◇",
    color: 0x70dbd9,
    description: "3 seconds of tag protection for runners.",
  },
  super: {
    name: "Super Jump",
    icon: "⬆",
    color: 0xc0a0ff,
    description: "Higher jumps for 6 seconds.",
  },
};
export interface Settings {
  duration: number;
  rounds: number;
  maps: string[];
  modifiers: string[];
  permanentDoubleJump: boolean;
  powers: PowerKind[];
  seed: string;
  controls: Controls[];
  sound: number;
  music: number;
  muted: boolean;
}
export const keyLabel = (code: string) =>
  ({
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Space: "Space",
  })[code] || code.replace(/^Key|^Digit/, "");
