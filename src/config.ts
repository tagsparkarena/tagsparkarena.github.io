export const WORLD = { width: 1000, height: 560, floor: 530, step: 1 / 120 };
export const TUNING = {
  speed: 475,
  acceleration: 8500,
  airAcceleration: 6500,
  turnMultiplier: 1.5,
  friction: 8500,
  gravity: 2400,
  jump: 900,
  jumpReleaseMultiplier: 0.9,
  maxFall: 1200,
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
  doubleDuration: 8,
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
export type PowerKind = "speed" | "shield" | "double";
export const POWER_INFO: Record<
  PowerKind,
  { name: string; icon: string; color: number; description: string }
> = {
  speed: {
    name: "Speed Burst",
    icon: "ϟ",
    color: 0xffcf5c,
    description: "35% faster for 4 seconds. Make your escape.",
  },
  shield: {
    name: "Invincibility Shield",
    icon: "◇",
    color: 0x70dbd9,
    description: "3 seconds of tag protection. Runners only.",
  },
  double: {
    name: "Double Jump",
    icon: "↑↑",
    color: 0xc0a0ff,
    description: "One extra jump in the air, for 8 seconds.",
  },
};
export interface Settings {
  duration: number;
  rounds: number;
  maps: string[];
  modifiers: string[];
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
