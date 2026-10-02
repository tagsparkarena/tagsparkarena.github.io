import "./style.css";
import {
  PALETTES,
  POWER_INFO,
  keyLabel,
  DEFAULT_CONTROLS,
  type Settings,
  type Controls,
  type PowerKind,
} from "./config";
import { MAPS, MODIFIERS } from "./maps";
import { World, selectRound, scoreRound, winners, type Score } from "./engine";
import {
  loadSettings,
  saveSettings,
  loadStats,
  saveStats,
  defaults,
} from "./storage";
import { Keyboard } from "./input";
import { AudioPlayer } from "./audio";
import { adPlaceholder } from "./ads";
import type { Session } from "./game";
import type Phaser from "phaser";
const root = document.querySelector<HTMLDivElement>("#app")!;
const settings = loadSettings(),
  keyboard = new Keyboard(settings.controls),
  audio = new AudioPlayer(settings);
const joined = new Set<number>();
const lobbyHeld = new Set<string>();
let lastAnnouncedIt = -1;
let game: Phaser.Game | null = null,
  session: Session | null = null,
  renderToken = 0,
  route = "home",
  round = 0,
  matchSeed = "",
  scores: Score[] = [],
  matchSettings: Settings;
let remap: { player: number; action: keyof Controls } | null = null;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const btn = (text: string, action: string, cls = "") =>
  `<button class="${cls}" data-action="${action}"${action === "fullscreen" ? ' aria-label="Toggle fullscreen"' : ""}>${text}</button>`;
const keys = (id: number) =>
  Object.entries(settings.controls[id])
    .map(
      ([action, code]) =>
        `<kbd data-key="${code}" title="${action}">${keyLabel(code)}</kbd>`,
    )
    .join("");
const brand = `<a class="brand" href="#home" aria-label="TagSpark Arena home"><span class="brand-icon">ϟ</span> TAGSPARK<span class="brand-small">ARENA</span></a>`;
function shell(content: string) {
  root.innerHTML = `<header>${brand}<nav>${btn("How to play", "how")}${btn("⚙ Settings", "settings")}<span class="local-badge">LOCAL MULTIPLAYER</span></nav></header><main>${content}</main><footer><span class="footer-brand">ϟ TAGSPARK ARENA <small>Local multiplayer tag</small></span><div><a href="#about">About</a><a href="#privacy">Privacy</a><a href="#credits">Credits</a><a href="#contact">Contact</a></div></footer><dialog id="modal"></dialog><div class="sr-only" id="announce" role="status" aria-live="polite"></div>`;
  bind();
  root.querySelector(".brand")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("home");
  });
}
function stop() {
  renderToken++;
  game?.destroy(true);
  game = null;
  session = null;
  keyboard.enabled = false;
  keyboard.clear();
  audio.music(false);
}
async function mount(target: string, s: Session) {
  const token = ++renderToken;
  const { createGame } = await import("./game");
  if (token !== renderToken) return;
  const parent = document.getElementById(target);
  if (!parent) return;
  session = s;
  game = createGame(parent, s);
}
function miniature(id: string) {
  const m = MAPS.find((m) => m.id === id)!;
  return `<svg viewBox="0 0 1000 560" aria-hidden="true"><rect width="1000" height="560" fill="#${m.sky.toString(16)}"/><path d="M0 490 Q250 250 500 490 T1000 490" fill="none" stroke="#173544" stroke-opacity=".05" stroke-width="60"/>${m.platforms.map((p) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="25" rx="8" fill="#${m.ground.toString(16)}"/>`).join("")}<rect y="530" width="1000" height="30" fill="#${m.ground.toString(16)}"/></svg>`;
}
function home() {
  stop();
  route = "home";
  document.title = "TagSpark Arena — local multiplayer tag";
  shell(
    `<section class="intro"><div><h1>TagSpark Arena</h1><p>Play tag with 2–4 players on one keyboard. Use power-ups to escape and avoid being <b>It</b> when time runs out.</p>${btn("Play <span>→</span>", "lobby", "primary")}<div class="small-note">Free browser game · Local multiplayer</div><p class="mobile-note">A desktop or laptop with a keyboard is recommended.</p></div><div class="preview"><div class="arena-label">SUNLIT COURTYARD <span>01 / ${String(MAPS.length).padStart(2, "0")}</span></div><div id="demo" class="demo-canvas"></div><div class="preview-caption"><span class="live-dot"></span> Gameplay preview</div></div></section><div class="feature-strip"><span>↔ <b>Shared-screen multiplayer</b></span><span>ϟ <b>3 power-ups</b></span><span>◇ <b>${MAPS.length} maps</b></span></div><section class="below"><div class="section-heading"><div><h2>Select your map</h2></div><span class="section-meta">${String(MAPS.length).padStart(2, "0")} ARENAS / 06 MODIFIERS</span></div><div class="map-grid">${MAPS.map((m, i) => `<button class="map-card" data-action="map:${m.id}"><div class="map-image">${miniature(m.id)}<span class="map-number">0${i + 1}</span></div><div class="map-copy"><h3>${m.name}</h3><span>${m.tagline}</span></div></button>`).join("")}</div></section><section class="power-section"><div><h2>Power-ups</h2><p>Collect temporary speed, shield and double-jump abilities during a round.</p></div><div class="power-cards">${Object.values(
      POWER_INFO,
    )
      .map(
        (p) =>
          `<div class="power-card"><span class="power-icon" style="background:#${p.color.toString(16)}">${p.icon}</span><div><h3>${p.name}</h3><p>${p.description}</p></div></div>`,
      )
      .join("")}</div></section>${adPlaceholder()}`,
  );
  const world = new World(
    MAPS[0],
    MODIFIERS[0],
    [0, 1, 2, 3],
    1,
    999999,
    ["speed", "double"],
    "demo",
  );
  void mount("demo", {
    world,
    keyboard,
    audio,
    paused: false,
    countdown: 0,
    demo: true,
    reduced,
    onFrame: () => {},
    onEnd: () => {},
  });
}
function lobby() {
  stop();
  route = "lobby";
  document.title = "Gather your players — TagSpark";
  shell(
    `<section class="lobby-heading"><div><h1>Select players</h1><p>Press your jump key or select Join to enter the match.</p></div>${btn("← Back", "home", "quiet")}</section><div class="player-grid">${PALETTES.map((p, id) => `<article class="player-card ${joined.has(id) ? "joined" : ""}" style="--player:${p.color};--player-dark:${p.dark}" id="player-${id}"><div class="player-card-top"><span>PLAYER 0${id + 1}</span><span class="join-status">${joined.has(id) ? "READY" : "OPEN SPOT"}</span></div><div class="avatar"><span>• •</span><small>${p.symbol}</small></div><h2>${p.name}</h2><div class="key-row">${keys(id)}</div><p>Move · Jump · Drop through</p>${btn(joined.has(id) ? "Leave" : "Join", `join:${id}`, joined.has(id) ? "joined-button" : "join-button")}${btn("Remap keys", `remap:${id}`, "text-button")}</article>`).join("")}</div><div class="lobby-bottom"><div class="input-test"><b>Keyboard check</b><span id="key-readout" aria-live="polite">Hold everyone’s movement keys together.</span><small>If a key won’t light up, try remapping it. Some keyboards limit simultaneous presses.</small></div><div class="match-summary"><span>${settings.rounds} rounds · ${settings.duration}s · ${settings.maps.length} maps</span>${btn("Customize match", "custom", "secondary")}${btn("Start match <span>→</span>", "start", "primary")}</div></div><p class="lobby-hint" id="lobby-hint">${joined.size < 2 ? "At least two players need to join." : `${joined.size} players ready.`}</p>`,
  );
  root.querySelector<HTMLButtonElement>('[data-action="start"]')!.disabled =
    joined.size < 2;
  paintKeys();
}
function paintKeys() {
  root
    .querySelectorAll<HTMLElement>("kbd[data-key]")
    .forEach((k) =>
      k.classList.toggle("pressed", lobbyHeld.has(k.dataset.key!)),
    );
  const readout = document.getElementById("key-readout");
  if (readout)
    readout.textContent = lobbyHeld.size
      ? `Detected: ${[...lobbyHeld].map(keyLabel).join(" + ")}`
      : "Hold everyone’s movement keys together.";
}
function startMatch() {
  if (joined.size < 2) return;
  round = 0;
  matchSeed = settings.seed || Math.random().toString(36).slice(2, 9);
  matchSettings = structuredClone(settings);
  scores = [...joined]
    .sort()
    .map((id) => ({ id, wins: 0, itTime: 0, tags: 0, pickups: 0 }));
  audio.unlock();
  startRound();
}
function startRound() {
  stop();
  window.scrollTo({ top: 0, behavior: "instant" });
  route = "game";
  lastAnnouncedIt = -1;
  const choice = selectRound(
    matchSeed,
    round,
    matchSettings.maps,
    matchSettings.modifiers,
    scores.map((s) => s.id),
  );
  const world = new World(
    choice.map,
    choice.modifier,
    scores.map((s) => s.id),
    choice.it,
    matchSettings.duration,
    matchSettings.powers,
    `${matchSeed}:${round}`,
  );
  shell(
    `<div class="game-heading"><div><span class="eyebrow">ROUND ${round + 1} OF ${matchSettings.rounds}</span><h2>${choice.map.name}</h2></div><div class="game-tools"><span class="modifier-badge" title="${choice.modifier.description}">${choice.modifier.icon} ${choice.modifier.name}</span>${btn("Ⅱ Pause", "pause", "secondary")}${btn("⛶", "fullscreen", "icon-button")}</div></div><section class="game-shell"><div class="game-hud"><div id="player-hud" class="player-hud"></div><div class="timer" id="timer">${formatTime(world.remaining)}</div></div><div class="game-viewport"><div id="arena" class="arena-canvas"></div><div id="countdown" class="countdown"><span>${choice.modifier.name}</span><strong>3</strong><p>${choice.modifier.description}</p></div></div><div class="game-bottom"><span id="it-message">P${world.it + 1} starts as It</span><span>Don’t hold the spark at zero. <kbd>Esc</kbd> pause</span></div></section><div class="under-game"><span>Seed <b>${esc(matchSeed)}</b></span><span>Jump again in the air with ↑↑ · Hold your action key to drop down</span></div>`,
  );
  keyboard.enabled = true;
  audio.music(true);
  void mount("arena", {
    world,
    keyboard,
    audio,
    paused: false,
    countdown: 3,
    demo: false,
    reduced,
    onFrame: updateHud,
    onEnd: finishRound,
  });
}
function formatTime(seconds: number) {
  const n = Math.ceil(seconds);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
function updateHud() {
  if (!session || route !== "game") return;
  const w = session.world;
  if (w.it !== lastAnnouncedIt) {
    document.getElementById("announce")!.textContent =
      `Player ${w.it + 1} ${PALETTES[w.it].name} is It.`;
    lastAnnouncedIt = w.it;
  }
  document.getElementById("timer")!.textContent = formatTime(w.remaining);
  document
    .getElementById("timer")!
    .classList.toggle("urgent", w.remaining <= 10);
  const count = document.getElementById("countdown")!;
  count.hidden = session.countdown <= 0;
  count.querySelector("strong")!.textContent = String(
    Math.ceil(session.countdown),
  );
  document.getElementById("player-hud")!.innerHTML = w.players
    .map(
      (p) =>
        `<div class="hud-player ${w.it === p.id ? "is-it" : ""}" style="--player:${PALETTES[p.id].color}"><span class="hud-dot">${PALETTES[p.id].symbol}</span><div><b>P${p.id + 1} ${w.it === p.id ? "· IT" : ""}</b><small>${
          Object.entries(p.buffs)
            .filter(([, t]) => t > w.time)
            .map(
              ([k, t]) =>
                `${POWER_INFO[k as PowerKind].icon} ${(t - w.time).toFixed(1)}s`,
            )
            .join(" ") || `${p.itTime.toFixed(1)}s holding spark`
        }</small></div></div>`,
    )
    .join("");
  document.getElementById("it-message")!.textContent =
    w.time < w.tagLockedUntil && w.time > 2
      ? "Tag lock — take a breath!"
      : `P${w.it + 1} ${PALETTES[w.it].name} has the spark`;
}
function finishRound() {
  if (!session) return;
  const w = session.world;
  scores = scoreRound(scores, w);
  const lifetime = loadStats();
  lifetime.rounds++;
  lifetime.tags += w.players.reduce((n, p) => n + p.tags, 0);
  lifetime.pickups += w.players.reduce(
    (n, p) => n + Object.values(p.pickups).reduce((a, b) => a + b, 0),
    0,
  );
  const final = round + 1 >= matchSettings.rounds;
  if (final) lifetime.matches++;
  saveStats(lifetime);
  audio.effect("end");
  const loser = w.it;
  stop();
  route = "results";
  const leaders = winners(scores);
  shell(
    `<section class="results-heading"><span class="eyebrow">${final ? "MATCH COMPLETE" : `ROUND ${round + 1} COMPLETE`}</span><div class="result-spark">${final ? "✦" : "ϟ"}</div><h1>${final ? (leaders.length === 1 ? `${PALETTES[leaders[0]].name} wins` : "Match tied") : `${PALETTES[loser].name} loses the round`}</h1><p>${final ? `${leaders.map((id) => `P${id + 1}`).join(" & ")} ${leaders.length === 1 ? "wins" : "share the win"} with ${Math.max(...scores.map((s) => s.wins))} round wins.` : "All other players earn one round win."}</p></section><div class="scoreboard"><div class="score-head"><span>PLAYER</span><span>WINS</span><span>TIME AS IT</span><span>TAGS</span><span>PICKUPS</span></div>${[
      ...scores,
    ]
      .sort((a, b) => b.wins - a.wins || a.id - b.id)
      .map(
        (s) =>
          `<div class="score-row"><span><i style="background:${PALETTES[s.id].color}">${PALETTES[s.id].symbol}</i><b>P${s.id + 1} ${PALETTES[s.id].name}</b></span><strong>${s.wins}</strong><span>${s.itTime.toFixed(1)}s</span><span>${s.tags}</span><span>${s.pickups}</span></div>`,
      )
      .join(
        "",
      )}</div><p class="score-note">Round wins decide the match. Time holding the spark is just a stat. Equal wins = shared victory.</p><div class="results-actions">${btn(final ? "Rematch <span>↻</span>" : "Next round <span>→</span>", final ? "rematch" : "next", "primary")}${btn("Back to lobby", "lobby", "secondary")}</div><p class="seed-line">Match seed: ${esc(matchSeed)}</p>${adPlaceholder()}`,
  );
  if (!reduced) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.setAttribute("aria-hidden", "true");
    c.innerHTML = Array.from(
      { length: 24 },
      (_, i) =>
        `<i style="left:${(i * 43) % 100}%;background:${PALETTES[i % 4].color};animation-delay:${i * 0.05}s;--drift:${i % 2 ? 80 : -80}px"></i>`,
    ).join("");
    root.append(c);
    setTimeout(() => c.remove(), 3200);
  }
}
function dialog(content: string) {
  const d = document.getElementById("modal") as HTMLDialogElement;
  d.innerHTML = content;
  const heading = d.querySelector("h2");
  if (heading) {
    heading.id = "dialog-title";
    d.setAttribute("aria-labelledby", "dialog-title");
  }
  d.showModal();
  bind(d);
  return d;
}
function closeDialog() {
  remap = null;
  (document.getElementById("modal") as HTMLDialogElement).close();
  if (session && route === "game") {
    session.paused = false;
    keyboard.clear();
    keyboard.enabled = true;
    audio.music(true);
  }
}
function pause() {
  if (!session || session.demo || session.paused || route !== "game") return;
  session.paused = true;
  keyboard.clear();
  keyboard.enabled = false;
  audio.music(false);
  dialog(
    `<h2>Paused</h2><p>The round timer is paused.</p><div class="dialog-actions">${btn("Keep playing", "resume", "primary")}${btn("Restart match", "restart", "secondary")}${btn("Back to lobby", "lobby", "quiet")}</div><p class="small-note">Restart with <kbd>R</kbd> while paused.</p>`,
  );
}
function showSettings() {
  if (route === "game") pause();
  const d = document.getElementById("modal") as HTMLDialogElement;
  if (d.open) d.close();
  dialog(
    `<h2>Sound & settings</h2><label class="range-row">Sound effects <input id="sound" type="range" min="0" max="1" step=".05" value="${settings.sound}"></label><label class="range-row">Music <input id="music" type="range" min="0" max="1" step=".05" value="${settings.music}"></label><label class="check-row"><input type="checkbox" id="mute" ${settings.muted ? "checked" : ""}> Mute all audio</label><p class="small-note">Reduced motion: ${reduced ? "enabled by your system" : "follows your system preference"}. Settings stay on this device.</p><p class="small-note">${loadStats().matches} matches · ${loadStats().tags} tags on this device</p>${btn("Done", "close", "primary")}`,
  );
  for (const key of ["sound", "music"] as const)
    document.getElementById(key)!.addEventListener("input", (e) => {
      settings[key] = Number((e.target as HTMLInputElement).value);
      saveSettings(settings);
      audio.unlock();
      if (key === "sound") audio.effect("pickup");
    });
  document.getElementById("mute")!.addEventListener("change", (e) => {
    settings.muted = (e.target as HTMLInputElement).checked;
    saveSettings(settings);
  });
}
function custom() {
  dialog(
    `<h2>Match settings</h2><form id="custom-form"><div class="form-grid"><label>Round length<select name="duration">${[30, 60, 90, 120].map((n) => `<option value="${n}" ${settings.duration === n ? "selected" : ""}>${n} seconds</option>`).join("")}</select></label><label>Rounds<select name="rounds">${[1, 3, 5, 7].map((n) => `<option ${settings.rounds === n ? "selected" : ""}>${n}</option>`).join("")}</select></label></div><fieldset><legend>Maps <small>Choose at least one</small></legend>${MAPS.map((m) => `<label class="check-chip"><input type="checkbox" name="maps" value="${m.id}" ${settings.maps.includes(m.id) ? "checked" : ""}>${m.name}</label>`).join("")}</fieldset><fieldset><legend>Round modifiers <small>One randomly selected per round</small></legend>${MODIFIERS.map((m) => `<label class="check-chip" title="${m.description}"><input type="checkbox" name="modifiers" value="${m.id}" ${settings.modifiers.includes(m.id) ? "checked" : ""}>${m.name}</label>`).join("")}</fieldset><fieldset><legend>Power-ups</legend>${Object.entries(
      POWER_INFO,
    )
      .map(
        ([id, p]) =>
          `<label class="check-chip"><input type="checkbox" name="powers" value="${id}" ${settings.powers.includes(id as PowerKind) ? "checked" : ""}>${p.name}</label>`,
      )
      .join(
        "",
      )}</fieldset><label>Match seed <small>Optional — repeat a map & modifier sequence</small><input name="seed" type="text" value="${esc(settings.seed)}" maxlength="40" placeholder="Surprise us"></label><p id="form-error" role="alert"></p><div class="dialog-actions"><button type="submit" class="primary">Save match</button>${btn("Cancel", "close", "secondary")}${btn("Reset defaults", "defaults", "quiet")}</div></form>`,
  );
  document.getElementById("custom-form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target as HTMLFormElement);
    if (!f.getAll("maps").length) {
      document.getElementById("form-error")!.textContent =
        "Choose at least one playground.";
      return;
    }
    settings.duration = Number(f.get("duration"));
    settings.rounds = Number(f.get("rounds"));
    settings.maps = f.getAll("maps") as string[];
    settings.modifiers = f.getAll("modifiers") as string[];
    settings.powers = f.getAll("powers") as PowerKind[];
    settings.seed = String(f.get("seed"));
    saveSettings(settings);
    closeDialog();
    lobby();
  });
}
function showRemap(id: number) {
  const d = document.getElementById("modal") as HTMLDialogElement;
  if (d.open) d.close();
  dialog(
    `<span class="eyebrow">PLAYER ${id + 1} · ${PALETTES[id].name.toUpperCase()}</span><h2>Remap controls</h2><p>Choose an action, then press a letter, number, arrow, or Space. Each key belongs to one action.</p><div class="remap-grid">${Object.entries(
      settings.controls[id],
    )
      .map(([action, code]) =>
        btn(
          `${action}<kbd>${keyLabel(code)}</kbd>`,
          `capture:${id}:${action}`,
          "remap-button",
        ),
      )
      .join(
        "",
      )}</div><p id="remap-message" role="status">Esc and R are reserved for pause and restart.</p><div class="dialog-actions">${btn("Done", "remap-done", "primary")}${btn("Restore all default keys", "reset-keys", "secondary")}</div>`,
  );
}
function page(name: string) {
  stop();
  route = name;
  const text: Record<string, string> = {
    how: `<h1>How to play</h1><p>TagSpark is a local party game for 2–4 friends on one keyboard. One player has the spark — that’s “It.” Touch a runner to pass it on.</p><ol class="how-steps"><li><b>Join the lobby</b> Press your jump key in the lobby, then check everyone’s keys work together.</li><li><b>Movement</b> The ring and IT label show who has the spark. Land on platforms from above. Hold your action key to drop through.</li><li><b>Scoring</b> Whoever is It when the timer reaches zero loses. Everyone else earns one win. Most wins takes the match; equal scores share victory.</li></ol><h2>Tag rules</h2><p>A 1.25-second lock after each tag stops instant tag-backs. The chaser gradually gets up to 12% extra speed if they haven’t tagged anyone for a while. Everyone starts with identical movement.</p><h2>Power-ups</h2>${Object.values(
      POWER_INFO,
    )
      .map((p) => `<p><b>${p.icon} ${p.name}:</b> ${p.description}</p>`)
      .join(
        "",
      )}<p>Shields cannot be picked up by It, and there’s a cooldown before the same runner can get another. Power-ups reset each round.</p><h2>Default controls</h2><div class="help-controls">${PALETTES.map((p, id) => `<p><b>P${id + 1} ${p.name}</b><span>${keys(id)}</span></p>`).join("")}</div><p>Keys are shown in order: left, right, jump, drop. Tap jump for a short hop; hold it for height. Esc pauses. R restarts only while paused.</p>${btn("Gather your players <span>→</span>", "lobby", "primary")}`,
    about: `<h1>About TagSpark Arena</h1><p>TagSpark Arena is a free browser playground built around a simple rule: don’t be It at the buzzer. ${MAPS.length} arenas, three temporary power-ups, and six optional modifiers make each chase feel a little different.</p><p>There are no accounts, downloads, online matchmaking, or purchases. Your friends sit beside you, your scores stay on your device, and a rematch is always one click away.</p><h2>Accessibility</h2><p>Players have their own color, number, and symbol. Controls can be remapped, audio can be muted, and the game respects your device’s reduced-motion setting.</p>${btn("Play <span>→</span>", "lobby", "primary")}`,
    privacy: `<h1>Privacy</h1><p>This version has no accounts, analytics, tracking scripts, or live advertising. Match settings, key bindings, audio preferences, and aggregate game statistics are saved in your browser’s local storage. We do not send these gameplay records to a server.</p><p>Clearing this site’s browser data removes those settings and statistics. Local storage may be unavailable in some private browsing modes; the game still works.</p><p>When this site is hosted, the hosting provider may process ordinary request information such as IP addresses for delivery and security. The owner should update this page with their contact information, hosting details, and any future advertising or consent practices before public launch.</p><h2>Advertising</h2><p>Areas labeled Advertisement are currently empty placeholders. No ad network is contacted. If advertising is enabled later, this notice will need to describe those services and the choices available to visitors.</p>`,
    credits: `<h1>Credits</h1><p>Game design, original character geometry, interface, map layouts, and synthesized sound were created for TagSpark Arena.</p><h2>Textures</h2><p>Subtle pattern textures by <a href="https://kenney.nl/assets/pattern-pack" target="_blank" rel="noopener">Kenney — Pattern Pack</a>, released under CC0. Copies are served from this site, never hotlinked.</p><h2>Built with</h2><p>Phaser 3 (MIT), TypeScript, and Vite. The game uses your device’s system fonts and no remote font service.</p>`,
    contact: `<h1>Contact</h1><p>Contact details will be added by the site owner before public launch.</p><p>For a helpful bug report, include the match seed shown below the arena, map name, player count, browser, and what happened. A keyboard model is useful when reporting missed keys.</p>`,
  };
  document.title = `${name === "how" ? "How to play" : name[0].toUpperCase() + name.slice(1)} — TagSpark Arena`;
  shell(
    `<article class="reading">${text[name] || text.about}<p>${btn("← Back to the playground", "home", "secondary")}</p></article>`,
  );
}
function navigate(name: string) {
  history.replaceState(
    null,
    "",
    `${location.pathname}${location.search}#${name}`,
  );
  if (name === "home") home();
  else if (name === "lobby") lobby();
  else page(name);
  window.scrollTo({ top: 0, behavior: "instant" });
}
function bind(scope: ParentNode = root) {
  scope
    .querySelectorAll<HTMLButtonElement>("[data-action]")
    .forEach((b) => b.addEventListener("click", () => act(b.dataset.action!)));
}
function act(action: string) {
  const [type, arg, extra] = action.split(":");
  if (["home", "lobby", "how"].includes(type)) {
    navigate(type);
    return;
  }
  if (type === "join") {
    const id = Number(arg);
    if (joined.has(id)) joined.delete(id);
    else joined.add(id);
    lobby();
  } else if (type === "start" || type === "rematch") startMatch();
  else if (type === "next") {
    round++;
    startRound();
  } else if (type === "pause") pause();
  else if (type === "resume" || type === "close") closeDialog();
  else if (type === "settings") showSettings();
  else if (type === "custom") custom();
  else if (type === "restart") {
    closeDialog();
    round = 0;
    scores = scores.map((s) => ({
      ...s,
      wins: 0,
      itTime: 0,
      tags: 0,
      pickups: 0,
    }));
    startRound();
  } else if (type === "fullscreen") {
    const el = document.querySelector(".game-shell")!;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen().catch(() => {});
  } else if (type === "map") {
    const m = MAPS.find((m) => m.id === arg)!;
    dialog(
      `<span class="eyebrow">${m.tagline}</span><h2>${m.name}</h2><div class="map-dialog-art">${miniature(m.id)}</div><p>${m.description}</p><div class="dialog-actions">${btn("Play this map", "choose-map:" + m.id, "primary")}${btn("Close", "close", "secondary")}</div>`,
    );
  } else if (type === "choose-map") {
    settings.maps = [arg];
    saveSettings(settings);
    closeDialog();
    lobby();
  } else if (type === "remap") showRemap(Number(arg));
  else if (type === "capture") {
    remap = { player: Number(arg), action: extra as keyof Controls };
    document.getElementById("remap-message")!.textContent =
      `Press a new key for ${extra}…`;
  } else if (type === "remap-done") {
    closeDialog();
    lobby();
  } else if (type === "reset-keys") {
    settings.controls = DEFAULT_CONTROLS.map((c) => ({ ...c }));
    keyboard.controls = settings.controls;
    saveSettings(settings);
    closeDialog();
    lobby();
  } else if (type === "defaults") {
    const d = defaults();
    settings.maps = d.maps;
    settings.modifiers = d.modifiers;
    settings.powers = d.powers;
    settings.duration = d.duration;
    settings.rounds = d.rounds;
    settings.seed = "";
    saveSettings(settings);
    closeDialog();
    lobby();
  }
}
window.addEventListener("keydown", (e) => {
  const modal = document.getElementById("modal") as HTMLDialogElement;
  if (remap) {
    e.preventDefault();
    if (e.code === "Escape") {
      remap = null;
      document.getElementById("remap-message")!.textContent =
        "Key change cancelled.";
      return;
    }
    if (
      !/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space)$/.test(e.code) ||
      e.code === "KeyR"
    ) {
      document.getElementById("remap-message")!.textContent =
        "Choose a letter, number, arrow, or Space. R is reserved.";
      return;
    }
    const duplicate = settings.controls.some((c, id) =>
      Object.entries(c).some(
        ([a, k]) =>
          k === e.code && (id !== remap!.player || a !== remap!.action),
      ),
    );
    if (duplicate) {
      document.getElementById("remap-message")!.textContent =
        "That key is already assigned. Try another.";
      return;
    }
    const id = remap.player;
    settings.controls[id][remap.action] = e.code;
    saveSettings(settings);
    remap = null;
    showRemap(id);
    return;
  }
  if (e.code === "Escape" && route === "game") {
    e.preventDefault();
    if (modal.open) closeDialog();
    else pause();
    return;
  }
  if (e.code === "KeyR" && route === "game" && session?.paused) {
    act("restart");
    return;
  }
  if (modal?.open) return;
  if (route === "lobby") {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    lobbyHeld.add(e.code);
    if (settings.controls.some((c) => Object.values(c).includes(e.code)))
      e.preventDefault();
    if (!e.repeat) {
      const id = settings.controls.findIndex((c) => c.jump === e.code);
      if (id >= 0 && !joined.has(id)) {
        joined.add(id);
        lobby();
      }
    }
    paintKeys();
  }
});
window.addEventListener("keyup", (e) => {
  lobbyHeld.delete(e.code);
  if (route === "lobby") paintKeys();
});
window.addEventListener("blur", () => {
  lobbyHeld.clear();
  pause();
  document
    .querySelectorAll("kbd.pressed")
    .forEach((k) => k.classList.remove("pressed"));
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
document.addEventListener(
  "cancel",
  (e) => {
    if ((e.target as HTMLElement).id === "modal") {
      e.preventDefault();
      closeDialog();
    }
  },
  true,
);
window.addEventListener("hashchange", () =>
  navigate(location.hash.slice(1) || "home"),
);
navigate(
  ["home", "about", "privacy", "credits", "contact", "how"].includes(
    location.hash.slice(1),
  )
    ? location.hash.slice(1)
    : "home",
);
type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options?: { signal: AbortSignal },
  ) => void | Promise<void>;
};
const webToolsLifecycle = new AbortController();
window.addEventListener("pagehide", () => webToolsLifecycle.abort(), {
  once: true,
});
if (import.meta.hot) import.meta.hot.dispose(() => webToolsLifecycle.abort());
const context = (document as Document & { modelContext?: ModelContext })
  .modelContext;
if (context) {
  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: "read_game_status",
          description: "Read TagSpark lobby or active match status.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute: () => ({
            screen: route,
            joined: [...joined],
            round: round + 1,
            remaining: session?.world.remaining,
            it: session?.world.it,
            paused: session?.paused,
            scores,
            players: session?.world.players.map((p) => ({
              id: p.id,
              x: p.x,
              y: p.y,
              tags: p.tags,
              pickups: p.pickups,
              buffs: p.buffs,
            })),
          }),
        },
        { signal: webToolsLifecycle.signal },
      ),
    ).catch(() => {});
  } catch {
    /* Experimental browser API. */
  }
}
// Development-only QA hooks. Eliminated from the production build.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("test")) {
  if (context)
    void Promise.resolve(
      context.registerTool(
        {
          name: "development_test_action",
          description:
            "Development-only game QA: prepare a deterministic tag or pickup, finish a test round, or skip its countdown. Alters only this local test match.",
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: [
                  "skip_countdown",
                  "arrange_tag",
                  "pickup_speed",
                  "pickup_shield",
                  "pickup_double",
                  "finish_round",
                ],
              },
            },
            required: ["action"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute(input) {
            const a = (input as { action?: string })?.action;
            if (
              ![
                "skip_countdown",
                "arrange_tag",
                "pickup_speed",
                "pickup_shield",
                "pickup_double",
                "finish_round",
              ].includes(a || "")
            )
              throw new Error("Unknown test action");
            if (!session || session.demo || route !== "game")
              throw new Error("Start a test round first.");
            const w = session.world;
            if (a === "skip_countdown") session.countdown = 0;
            else if (a === "finish_round") {
              w.remaining = 0.01;
              w.duration = w.time + 0.01;
            } else if (a === "arrange_tag") {
              w.tagLockedUntil = 0;
              const from = w.players.find((p) => p.id === w.it)!,
                to = w.players.find((p) => p.id !== w.it)!;
              from.x = 490;
              to.x = 510;
              from.y = to.y = 530;
              from.vx = to.vx = from.vy = to.vy = 0;
              from.safeUntil = to.safeUntil = 0;
              to.buffs.shield = 0;
            } else {
              const kind = a!.slice(7) as PowerKind,
                p = w.players.find((p) => p.id !== w.it)!;
              w.pickups = [
                {
                  id: w.nextId++,
                  kind,
                  x: p.x,
                  y: p.y - 20,
                  ready: 0,
                  expires: w.time + 10,
                },
              ];
            }
            return { prepared: a };
          },
        },
        { signal: webToolsLifecycle.signal },
      ),
    ).catch(() => {});
  Object.assign(window, {
    __TAGSPARK__: {
      getState: () => ({
        route,
        joined: [...joined],
        round,
        scores,
        world: session?.world,
        paused: session?.paused,
        countdown: session?.countdown,
      }),
      skipCountdown: () => {
        if (session) session.countdown = 0;
      },
      expireRound: () => {
        if (session) {
          session.world.remaining = 0.01;
          session.world.duration = session.world.time + 0.01;
        }
      },
      arrangeTag: () => {
        if (session) {
          const w = session.world;
          w.time = 5;
          w.tagLockedUntil = 0;
          const a = w.players.find((p) => p.id === w.it)!;
          const b = w.players.find((p) => p.id !== w.it)!;
          a.x = 490;
          b.x = 510;
          a.y = b.y = 530;
          a.safeUntil = b.safeUntil = 0;
        }
      },
      givePickup: (kind: PowerKind) => {
        if (session) {
          const w = session.world,
            p = w.players.find((p) => p.id !== w.it)!;
          w.pickups = [
            {
              id: w.nextId++,
              kind,
              x: p.x,
              y: p.y - 20,
              ready: 0,
              expires: w.time + 10,
            },
          ];
        }
      },
      pause,
    },
  });
}
