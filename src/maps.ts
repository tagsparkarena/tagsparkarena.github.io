export interface Platform {
  oneWay?: boolean;
  wall?: boolean;
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
const layouts: ArenaMap[] = [
  {
    id: "courtyard",
    name: "Sunlit Courtyard",
    tagline: "WIDE TERRACES",
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
    tagline: "TWIN TOWERS",
    description:
      "Solid rooftop alcoves at different heights, with a central ground divider and four blue shortcuts.",
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
    tagline: "OFFSET BRIDGES",
    description:
      "Offset solid bridges form side passages and lower dead ends. Four blue platforms connect the routes.",
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
    tagline: "SPLIT LEVELS",
    description:
      "Long solid shelves form a central recess, an upper alcove and a ground-level dead end on the right.",
    sky: 0xe0dff1,
    ground: 0x74659a,
    accent: 0xc0a4de,
    spawns: spawn,
    platforms: decks([
      [45, 440, 210],
      [350, 440, 300],
      [745, 440, 210],
      [50, 345, 430],
      [600, 345, 350],
      [240, 250, 200],
      [560, 250, 200],
      [40, 155, 255],
      [385, 155, 230],
      [670, 155, 290],
    ]),
  },
  {
    id: "cloud",
    name: "Cloud Playground",
    tagline: "EDGE PORTALS",
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
    tagline: "STAGGERED PLATFORMS",
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
    tagline: "LONG UPPER BRIDGE",
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
    tagline: "LOOPING ROUTES",
    description:
      "Four wall-and-shelf corners create staggered dead ends from the ground to the upper levels.",
    sky: 0xe9edda,
    ground: 0x6d8050,
    accent: 0xc0d58c,
    spawns: spawn,
    platforms: decks([
      [40, 440, 190],
      [305, 440, 280],
      [765, 440, 195],
      [50, 340, 380],
      [470, 340, 220],
      [780, 340, 180],
      [180, 240, 260],
      [565, 240, 300],
      [40, 145, 240],
      [330, 145, 270],
      [745, 145, 215],
    ]),
  },
];
// Explicit shortcuts per arena: solid horizontal decks always outnumber blue ones.
const shortcuts: Record<string, number[]> = {
  courtyard: [0, 4, 7, 2],
  rooftop: [0, 3, 10, 7],
  clockwork: [0, 1, 8, 6],
  cavern: [0, 4, 8, 5],
  cloud: [0, 3, 8, 6],
  switchback: [0, 4, 6, 3],
  skybridge: [0, 3, 6, 7],
  pinwheel: [0, 4, 10, 2],
};

export const MAPS: ArenaMap[] = layouts.map((map) => {
  const platforms: Platform[] = map.platforms.map((p, i) => ({
    ...p,
    x: Math.round(p.x * 1.4),
    y: Math.round(744 - (530 - p.y) * 1.4),
    w: Math.round(p.w * 1.4),
    h: 26,
    oneWay: shortcuts[map.id].includes(i),
  }));
  // Join the underside of a solid roof to a lower solid shelf (or the floor).
  // Each bay keeps an open side: a chase can hit a dead end without trapping players.
  const join = (roof: number, floor: number | null, x: number): Platform => {
    const y = platforms[roof].y + platforms[roof].h!;
    return {
      x,
      y,
      w: 32,
      h: (floor === null ? 744 : platforms[floor].y) - y,
      wall: true,
      oneWay: false,
    };
  };
  const walls: Record<string, () => Platform[]> = {
    rooftop: () => [join(5, 2, 126), join(9, 6, 1200), join(4, null, 700)],
    clockwork: () => [join(5, 3, 231), join(7, 2, 1305), join(4, 2, 1137)],
    cavern: () => [join(3, 1, 490), join(9, 6, 1032), join(2, null, 1043)],
    pinwheel: () => [
      join(8, 6, 360),
      join(7, 5, 1092),
      join(3, 1, 430),
      join(1, null, 787),
    ],
  };
  return {
    ...map,
    spawns: [133, 1267, 520, 880],
    platforms: [...platforms, ...(walls[map.id]?.() || [])],
  };
});

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
  doubleJump?: boolean;
}
export const MODIFIERS: Modifier[] = [
  {
    id: "classic",
    name: "Classic",
    icon: "○",
    description: "Standard movement and platform rules.",
  },
  {
    id: "gravity",
    name: "Low Gravity",
    icon: "☾",
    description: "Reduced gravity increases jump height and airtime.",
    gravity: 0.6,
  },
  {
    id: "ice",
    name: "Slippery Floors",
    icon: "≈",
    description: "Reduced ground friction makes turning and stopping slower.",
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
    description: "Platforms move horizontally.",
    moving: true,
  },
  {
    id: "speedy",
    name: "Speedy Round",
    icon: "»",
    description: "Everyone runs 15% faster.",
    speed: 1.15,
  },
];
