export interface Platform {
  x: number;
  y: number;
  w: number;
  h?: number;
  move?: number;
  phase?: number;
  slope?: number;
  ice?: boolean;
  bounce?: boolean;
}
export interface ArenaMap {
  id: string;
  name: string;
  tagline: string;
  description: string;
  sky: number;
  ground: number;
  accent: number;
  platforms: Platform[];
  portals?: boolean;
  spawns: number[];
}
const spawn = [95, 905, 425, 575];
export const MAPS: ArenaMap[] = [
  {
    id: "courtyard",
    name: "Sunlit Courtyard",
    tagline: "THE CLASSIC CHASE",
    description: "Gentle ramps, open lanes, and room to find your feet.",
    sky: 0xe0eee3,
    ground: 0x477f68,
    accent: 0xa7d77c,
    spawns: spawn,
    platforms: [
      { x: 35, y: 437, w: 210 },
      { x: 755, y: 437, w: 210 },
      { x: 290, y: 347, w: 155 },
      { x: 555, y: 347, w: 155 },
      { x: 420, y: 245, w: 160 },
      { x: 245, y: 530, w: 125, slope: -75 },
      { x: 630, y: 455, w: 125, slope: 75 },
    ],
  },
  {
    id: "rooftop",
    name: "Rooftop Garden",
    tagline: "TAKE THE HIGH ROAD",
    description:
      "Bounce above the rooftops. The scenic route is the escape route.",
    sky: 0xd8eaf0,
    ground: 0x457d7a,
    accent: 0x93d6a3,
    spawns: spawn,
    platforms: [
      { x: 40, y: 432, w: 190 },
      { x: 770, y: 432, w: 190 },
      { x: 260, y: 343, w: 170 },
      { x: 570, y: 343, w: 170 },
      { x: 420, y: 249, w: 160 },
      { x: 452, y: 524, w: 96, bounce: true },
      { x: 120, y: 335, w: 80, bounce: true },
      { x: 800, y: 335, w: 80, bounce: true },
    ],
  },
  {
    id: "clockwork",
    name: "Clockwork Crossing",
    tagline: "TIMING IS EVERYTHING",
    description: "Steady moving bridges reward a well-timed jump.",
    sky: 0xf2e9d6,
    ground: 0x967245,
    accent: 0xebc37a,
    spawns: spawn,
    platforms: [
      { x: 60, y: 431, w: 160, move: 35 },
      { x: 780, y: 431, w: 160, move: 35, phase: Math.PI },
      { x: 290, y: 342, w: 155, move: 55 },
      { x: 555, y: 342, w: 155, move: 55, phase: Math.PI },
      { x: 410, y: 245, w: 180, move: 45 },
    ],
  },
  {
    id: "cavern",
    name: "Crystal Cavern",
    tagline: "A SLIPPERY LITTLE SECRET",
    description: "Crystal ledges and icy slopes keep every chase interesting.",
    sky: 0xe0dff1,
    ground: 0x74659a,
    accent: 0xc0a4de,
    spawns: spawn,
    platforms: [
      { x: 40, y: 435, w: 200, ice: true },
      { x: 760, y: 435, w: 200, ice: true },
      { x: 285, y: 341, w: 160 },
      { x: 555, y: 341, w: 160 },
      { x: 405, y: 246, w: 190, ice: true },
      { x: 240, y: 530, w: 135, slope: -70, ice: true },
      { x: 625, y: 460, w: 135, slope: 70, ice: true },
    ],
  },
  {
    id: "cloud",
    name: "Cloud Playground",
    tagline: "THE SKY IS NOT THE LIMIT",
    description: "Launch pads and paired portals turn the chase upside down.",
    sky: 0xe0ecf8,
    ground: 0x648ca7,
    accent: 0xc0d9f0,
    spawns: spawn,
    portals: true,
    platforms: [
      { x: 60, y: 430, w: 180 },
      { x: 760, y: 430, w: 180 },
      { x: 285, y: 340, w: 160 },
      { x: 555, y: 340, w: 160 },
      { x: 420, y: 246, w: 160 },
      { x: 458, y: 524, w: 84, bounce: true },
      { x: 90, y: 340, w: 80, bounce: true },
      { x: 830, y: 340, w: 80, bounce: true },
    ],
  },
];
export interface Modifier {
  id: string;
  name: string;
  icon: string;
  description: string;
  gravity?: number;
  speed?: number;
  friction?: number;
  jump?: number;
  spawn?: number;
  moving?: boolean;
}
export const MODIFIERS: Modifier[] = [
  {
    id: "classic",
    name: "Classic",
    icon: "○",
    description: "Just you, your friends, and the spark.",
  },
  {
    id: "gravity",
    name: "Low Gravity",
    icon: "☾",
    description: "Longer airtime. More room for a last-second escape.",
    gravity: 0.6,
  },
  {
    id: "ice",
    name: "Slippery Floors",
    icon: "≈",
    description: "Less grip, more drift. Brake before the edge.",
    friction: 0.18,
  },
  {
    id: "rain",
    name: "Power-Up Rain",
    icon: "ϟ",
    description: "Pickups arrive twice as often.",
    spawn: 0.5,
  },
  {
    id: "moving",
    name: "Moving Platform Mayhem",
    icon: "↔",
    description: "The platforms join the chase.",
    moving: true,
  },
  {
    id: "bounce",
    name: "Super Bounce",
    icon: "↑",
    description: "Every jump gets a little more spring.",
    jump: 1.2,
  },
  {
    id: "speedy",
    name: "Speedy Round",
    icon: "»",
    description: "Everyone runs 15% faster.",
    speed: 1.15,
  },
];
