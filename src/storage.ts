import { DEFAULT_CONTROLS, type Settings } from "./config";
import { MAPS, MODIFIERS } from "./maps";
const KEY = "tagspark-v1";
export const defaults = (): Settings => ({
  mode: "local",
  aiDifficulty: "medium",
  duration: 90,
  rounds: 3,
  maps: MAPS.map((m) => m.id),
  modifiers: [],
  permanentDoubleJump: true,
  powers: ["speed", "shield", "super"],
  seed: "",
  controls: DEFAULT_CONTROLS.map((c) => ({ ...c })),
  sound: 0.5,
  music: 0.12,
  muted: false,
});
export function loadSettings(): Settings {
  const d = defaults();
  try {
    const v = JSON.parse(
      localStorage.getItem(KEY) || "{}",
    ) as Partial<Settings>;
    if (v.mode === "solo" || v.mode === "local") d.mode = v.mode;
    if (["easy", "medium", "hard"].includes(v.aiDifficulty || ""))
      d.aiDifficulty = v.aiDifficulty!;
    if ([30, 60, 90, 120].includes(v.duration || 0)) d.duration = v.duration!;
    if ([1, 3, 5, 7].includes(v.rounds || 0)) d.rounds = v.rounds!;
    for (const k of ["maps", "modifiers", "powers"] as const) {
      if (Array.isArray(v[k])) {
        const allowed = k === "modifiers" ? MODIFIERS.map((m) => m.id) : d[k];
        const a = v[k]!.map((x) =>
          k === "powers" && String(x) === "double" ? "super" : x,
        ).filter((x) => (allowed as string[]).includes(x));
        if (a.length || k !== "maps") (d[k] as string[]) = a;
      }
    }
    // Preserve custom selections; expand the previous "all maps" selection.
    if (
      v.maps?.length === 5 &&
      ["courtyard", "rooftop", "clockwork", "cavern", "cloud"].every((id) =>
        v.maps!.includes(id),
      )
    )
      d.maps = MAPS.map((m) => m.id);
    if (typeof v.seed === "string") d.seed = v.seed.slice(0, 40);
    if (Array.isArray(v.controls) && v.controls.length === 4) {
      const codes = v.controls.flatMap((c) => Object.values(c));
      if (
        codes.length === 16 &&
        new Set(codes).size === 16 &&
        codes.every(
          (c) =>
            typeof c === "string" &&
            /^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space)$/.test(c) &&
            c !== "KeyR",
        )
      )
        d.controls = v.controls;
    }
    for (const k of ["sound", "music"] as const)
      if (typeof v[k] === "number" && Number.isFinite(v[k]))
        d[k] = Math.max(0, Math.min(1, v[k]!));
    d.muted = v.muted === true;
    if (typeof v.permanentDoubleJump === "boolean")
      d.permanentDoubleJump = v.permanentDoubleJump;
  } catch {
    /* Unavailable or stale storage uses safe defaults. */
  }
  return d;
}
export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* Private browsing can prohibit writes. */
  }
}
export interface Lifetime {
  matches: number;
  rounds: number;
  tags: number;
  pickups: number;
}
export function loadStats(): Lifetime {
  try {
    const v = JSON.parse(localStorage.getItem(`${KEY}-stats`) || "{}");
    return {
      matches: Number(v.matches) || 0,
      rounds: Number(v.rounds) || 0,
      tags: Number(v.tags) || 0,
      pickups: Number(v.pickups) || 0,
    };
  } catch {
    return { matches: 0, rounds: 0, tags: 0, pickups: 0 };
  }
}
export function saveStats(s: Lifetime) {
  try {
    localStorage.setItem(`${KEY}-stats`, JSON.stringify(s));
  } catch {
    /* Nonessential persistence. */
  }
}
