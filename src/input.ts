import type { Controls } from "./config";
import type { Input } from "./engine";
export class Keyboard {
  held = new Set<string>();
  pressed = new Set<string>();
  enabled = false;
  constructor(public controls: Controls[]) {
    window.addEventListener("keydown", this.down);
    window.addEventListener("keyup", this.up);
    window.addEventListener("blur", () => this.clear());
  }
  down = (e: KeyboardEvent) => {
    if (!this.enabled || e.metaKey || e.ctrlKey || e.altKey) return;
    if (
      Object.values(this.controls).some((c) =>
        Object.values(c).includes(e.code),
      )
    ) {
      e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
    }
  };
  up = (e: KeyboardEvent) => {
    this.held.delete(e.code);
  };
  clear() {
    this.held.clear();
    this.pressed.clear();
  }
  read(ids: number[]): Record<number, Input> {
    const active = (code: string) =>
      this.held.has(code) || this.pressed.has(code);
    const inputs = Object.fromEntries(
      ids.map((id) => {
        const c = this.controls[id];
        return [
          id,
          {
            left: active(c.left),
            right: active(c.right),
            jump: active(c.jump),
            action: active(c.action),
          },
        ];
      }),
    );
    this.pressed.clear();
    return inputs;
  }
}
