import { afterEach, describe, it, expect, vi } from "vitest";
import { Keyboard } from "../src/input";
import { DEFAULT_CONTROLS } from "../src/config";
afterEach(() => vi.unstubAllGlobals());
const event = (code: string) =>
  ({
    code,
    repeat: false,
    preventDefault: () => {
      /* test */
    },
  }) as KeyboardEvent;
describe("keyboard event capture", () => {
  it("retains a tap released between physics frames for exactly one read", () => {
    vi.stubGlobal("window", new EventTarget());
    const k = new Keyboard(DEFAULT_CONTROLS);
    k.enabled = true;
    k.down(event("KeyW"));
    k.up(event("KeyW"));
    expect(k.read([0, 1])[0].jump).toBe(true);
    expect(k.read([0, 1])[0].jump).toBe(false);
  });
  it("keeps multiple players held until keyup and clears everything on pause", () => {
    vi.stubGlobal("window", new EventTarget());
    const k = new Keyboard(DEFAULT_CONTROLS);
    k.enabled = true;
    for (const c of ["KeyD", "KeyW", "ArrowLeft", "ArrowUp"]) k.down(event(c));
    expect(k.read([0, 1])).toMatchObject({
      0: { right: true, jump: true },
      1: { left: true, jump: true },
    });
    expect(k.read([0, 1])[1].left).toBe(true);
    k.clear();
    expect(k.read([0, 1])[0].jump).toBe(false);
  });
  it("does not queue disabled input", () => {
    vi.stubGlobal("window", new EventTarget());
    const k = new Keyboard(DEFAULT_CONTROLS);
    k.down(event("KeyW"));
    k.enabled = true;
    expect(k.read([0])[0].jump).toBe(false);
  });
});
