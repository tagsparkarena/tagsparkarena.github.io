import type { Settings } from "./config";
export class AudioPlayer {
  context: AudioContext | null = null;
  musicTimer: number | undefined;
  step = 0;
  constructor(public settings: Settings) {}
  unlock() {
    this.context ??= new AudioContext();
    void this.context.resume();
  }
  tone(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    end?: number,
  ) {
    if (
      !this.context ||
      this.settings.muted ||
      volume === 0 ||
      this.context.state !== "running"
    )
      return;
    const c = this.context,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (end)
      o.frequency.exponentialRampToValueAtTime(end, c.currentTime + duration);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume * 0.12),
      c.currentTime + 0.01,
    );
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration + 0.02);
  }
  effect(name: string) {
    if (name === "tag")
      this.tone(650, 0.19, this.settings.sound, "triangle", 230);
    else if (name === "pickup")
      this.tone(550, 0.22, this.settings.sound, "sine", 1100);
    else if (name === "jump")
      this.tone(210, 0.09, this.settings.sound * 0.28, "sine", 420);
    else if (name === "end")
      this.tone(750, 0.6, this.settings.sound, "triangle", 350);
    else if (name === "tick") this.tone(700, 0.09, this.settings.sound * 0.4);
    else if (name === "portal")
      this.tone(290, 0.2, this.settings.sound, "sine", 900);
  }
  music(on: boolean) {
    window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
    if (!on) return;
    const notes = [
      130.81, 196, 261.63, 196, 146.83, 220, 293.66, 220, 164.81, 246.94,
      329.63, 246.94, 146.83, 220, 293.66, 196,
    ];
    this.musicTimer = window.setInterval(() => {
      this.tone(
        notes[this.step++ % notes.length],
        0.3,
        this.settings.music,
        "sine",
      );
    }, 310);
  }
}
