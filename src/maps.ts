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
const spawn = [95, 905, 355, 645];
// Broad flat decks; vertical steps stay below the unboosted jump height.
// All special platform movement is opt-in through round modifiers.
const decks = (rows: [number, number, number][]): Platform[] =>
  rows.map(([x, y, w]) => ({ x, y, w }));
export const MAPS: ArenaMap[] = [
  {
    id: "courtyard",
    name: "Sunlit Courtyard",
    tagline: "THE CLASSIC CHASE",
    description:
      "Wide flat terraces, two climbing routes and an open ground-level sprint. No ramps.",
    sky: 0xe0eee3,
    ground: 0x477f68,
    accent: 0xa7d77c,
    spawns: spawn,
    platforms: decks([
      [35, 435, 240],
      [725, 435, 240],
      [330, 435, 340],
      [170, 340, 245],
      [585, 340, 245],
      [35, 245, 185],
      [390, 245, 220],
      [780, 245, 185],
      [220, 150, 230],
      [550, 150, 230],
    ]),
  },
  {
    id: "rooftop",
    name: "Rooftop Garden",
    tagline: "TAKE THE HIGH ROAD",
    description:
      "Two rooftop towers surround a central drop lane. Climb either side and cross the skyline.",
    sky: 0xd8eaf0,
    ground: 0x457d7a,
    accent: 0x93d6a3,
    spawns: spawn,
    platforms: decks([
      [40, 435, 225],
      [735, 435, 225],
      [90, 335, 210],
      [700, 335, 210],
      [380, 430, 240],
      [30, 235, 230],
      [740, 235, 230],
      [380, 330, 240],
      [120, 135, 245],
      [635, 135, 245],
      [380, 230, 240],
    ]),
  },
  {
    id: "clockwork",
    name: "Clockwork Crossing",
    tagline: "SWITCH YOUR LANE",
    description:
      "Offset bridges interlock around three drop shafts. Switch levels to cut off a chase.",
    sky: 0xf2e9d6,
    ground: 0x967245,
    accent: 0xebc37a,
    spawns: spawn,
    platforms: decks([
      [45, 440, 260],
      [410, 440, 190],
      [700, 440, 255],
      [165, 345, 265],
      [555, 345, 280],
      [40, 250, 250],
      [405, 250, 190],
      [710, 250, 250],
      [180, 155, 250],
      [565, 155, 255],
    ]),
  },
  {
    id: "cavern",
    name: "Crystal Cavern",
    tagline: "FIND THE CUT-THROUGH",
    description:
      "Long shelves, staggered side exits and a split upper gallery. No slippery surprises.",
    sky: 0xe0dff1,
    ground: 0x74659a,
    accent: 0xc0a4de,
    spawns: spawn,
    platforms: decks([
      [45, 440, 210],
      [350, 440, 300],
      [745, 440, 210],
      [50, 345, 350],
      [600, 345, 350],
      [240, 250, 200],
      [560, 250, 200],
      [40, 155, 255],
      [385, 155, 230],
      [705, 155, 255],
    ]),
  },
  {
    id: "cloud",
    name: "Cloud Playground",
    tagline: "THE LONG WAY IS A SHORTCUT",
    description:
      "A broad central staircase meets two outer routes. Marked floor portals connect the edges.",
    sky: 0xe0ecf8,
    ground: 0x648ca7,
    accent: 0xc0d9f0,
    spawns: spawn,
    portals: true,
    platforms: decks([
      [80, 440, 210],
      [390, 440, 220],
      [710, 440, 210],
      [250, 345, 220],
      [530, 345, 220],
      [45, 250, 200],
      [380, 250, 240],
      [755, 250, 200],
      [185, 155, 250],
      [565, 155, 250],
    ]),
  },
  {
    id: "switchback",
    name: "Switchback Steps",
    tagline: "CHANGE DIRECTION. AGAIN.",
    description:
      "An asymmetric zigzag climbs across the whole arena. Short side decks create return routes.",
    sky: 0xf5e5dc,
    ground: 0x956553,
    accent: 0xe8b48e,
    spawns: spawn,
    platforms: decks([
      [40, 440, 300],
      [540, 440, 240],
      [835, 440, 130],
      [230, 340, 300],
      [720, 340, 240],
      [40, 240, 220],
      [440, 240, 300],
      [220, 140, 300],
      [800, 240, 160],
      [690, 140, 270],
    ]),
  },
  {
    id: "skybridge",
    name: "Skybridge Station",
    tagline: "OWN THE CROSSING",
    description:
      "A long high bridge is reached by twin stairways. Drop into the middle to reverse the chase.",
    sky: 0xdcecf1,
    ground: 0x52798c,
    accent: 0x9cd0df,
    spawns: spawn,
    platforms: decks([
      [40, 435, 220],
      [390, 435, 220],
      [740, 435, 220],
      [130, 340, 230],
      [640, 340, 230],
      [35, 245, 220],
      [745, 245, 220],
      [390, 245, 220],
      [180, 150, 640],
    ]),
  },
  {
    id: "pinwheel",
    name: "Pinwheel Plaza",
    tagline: "ROUND AND ROUND",
    description:
      "Four staggered terraces wind around a central deck. Cut across or loop around the outside.",
    sky: 0xe9edda,
    ground: 0x6d8050,
    accent: 0xc0d58c,
    spawns: spawn,
    platforms: decks([
      [40, 440, 190],
      [305, 440, 280],
      [765, 440, 195],
      [50, 340, 280],
      [470, 340, 220],
      [780, 340, 180],
      [180, 240, 260],
      [565, 240, 300],
      [40, 145, 180],
      [330, 145, 270],
      [745, 145, 215],
    ]),
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
