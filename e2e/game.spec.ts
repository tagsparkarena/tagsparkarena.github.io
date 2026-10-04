import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { World } from "../src/engine";

test("AI climbs to a stationary player on the top platform", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "tagspark-v1",
      JSON.stringify({
        mode: "solo",
        aiDifficulty: "hard",
        maps: ["courtyard"],
        powers: [],
      }),
    ),
  );
  await page.goto("/?test");
  await page.getByRole("button", { name: "Play →", exact: true }).click();
  await page
    .getByRole("button", { name: "Start match →", exact: true })
    .click();
  await page.waitForFunction(() => !!window.__TAGSPARK__.getState().world);
  await page.evaluate(() => {
    const world = window.__TAGSPARK__.getState().world as unknown as World;
    const top = world.platforms
      .filter((p) => p.index > 0 && !p.wall)
      .sort((a, b) => a.y - b.y)[0];
    Object.assign(world.players[0], {
      x: top.x + top.w / 2,
      y: top.y,
      ground: top.index,
      vx: 0,
      vy: 0,
      safeUntil: 0,
    });
    world.it = 1;
    world.tagLockedUntil = 0;
    window.__TAGSPARK__.skipCountdown();
  });
  await page.waitForFunction(
    () => window.__TAGSPARK__.getState().world.players[1].y < 300,
  );
  await page.screenshot({ path: "test-results/ai-upper-route.png" });
  await page.waitForFunction(
    () => window.__TAGSPARK__.getState().world.it === 0,
  );
});
test("solo difficulty, AI movement, pause, results, rematch and return to local play", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?test");
  await page.getByRole("button", { name: "Play →", exact: true }).click();
  await page.keyboard.press("KeyW");
  await page.keyboard.press("ArrowUp");
  await page.getByRole("button", { name: "Solo vs AI", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Solo practice" }),
  ).toBeVisible();
  await expect(page.locator(".player-card")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Remap keys", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Start match →", exact: true }),
  ).toBeEnabled();
  for (const level of ["easy", "medium", "hard"]) {
    await page.getByLabel("AI difficulty", { exact: true }).selectOption(level);
    await expect(page.locator("#player-1 .ai-level")).toContainText(
      level[0].toUpperCase() + level.slice(1),
    );
  }
  await page
    .getByRole("button", { name: "Customize match", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Rounds", exact: true })
    .selectOption("1");
  await page.getByRole("button", { name: "Save match", exact: true }).click();
  await expect(page.getByLabel("AI difficulty", { exact: true })).toHaveValue(
    "hard",
  );
  await page.screenshot({
    path: "test-results/solo-lobby.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Start match →", exact: true })
    .click();
  await page.waitForFunction(
    () => window.__TAGSPARK__.getState().world?.players.length === 2,
  );
  await page.evaluate(() => window.__TAGSPARK__.skipCountdown());
  // A runner may correctly wait at a safe distance. Make the AI the chaser
  // before asserting movement, regardless of the seeded starting It.
  await page.evaluate(() => {
    if (window.__TAGSPARK__.getState().world.it === 0)
      window.__TAGSPARK__.arrangeTag();
  });
  await page.waitForFunction(
    () => window.__TAGSPARK__.getState().world.it === 1,
  );
  const before = await page.evaluate(
    () => window.__TAGSPARK__.getState().world.players[1].x,
  );
  await page.waitForFunction(
    (x) => Math.abs(window.__TAGSPARK__.getState().world.players[1].x - x) > 60,
    before,
  );
  await expect(page.locator("#player-hud")).toContainText("AI");
  await page.keyboard.press("Escape");
  const pausedTime = await page.evaluate(
    () => window.__TAGSPARK__.getState().world.remaining,
  );
  const pausedX = await page.evaluate(
    () => window.__TAGSPARK__.getState().world.players[1].x,
  );
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => window.__TAGSPARK__.getState().world.remaining),
  ).toBe(pausedTime);
  expect(
    await page.evaluate(
      () => window.__TAGSPARK__.getState().world.players[1].x,
    ),
  ).toBe(pausedX);
  await page.getByRole("button", { name: "Keep playing", exact: true }).click();
  await page.evaluate(() => window.__TAGSPARK__.expireRound());
  await expect(page.locator(".scoreboard")).toContainText("AI");
  await page.getByRole("button", { name: "Rematch ↻", exact: true }).click();
  await expect(page.locator(".eyebrow")).toContainText("SOLO / HARD");
  await page.waitForFunction(() => !!window.__TAGSPARK__.getState().world);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Back to lobby", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Local multiplayer", exact: true })
    .click();
  await expect(page.locator(".player-card")).toHaveCount(4);
  await expect(page.locator(".player-card.joined")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Start match →", exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});
type State = {
  route: string;
  round: number;
  paused: boolean;
  world: {
    it: number;
    remaining: number;
    players: {
      id: number;
      x: number;
      y: number;
      pickups: Record<string, number>;
    }[];
  };
};
declare global {
  interface Window {
    __TAGSPARK__: {
      getState: () => State;
      skipCountdown: () => void;
      expireRound: () => void;
      arrangeTag: () => void;
      givePickup: (kind: string) => void;
    };
  }
}
test("complete a two-player match with tags, pickups, pause and rematch", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?test");
  await page.getByRole("button", { name: "Play →", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start match →", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("KeyW");
  await page.keyboard.press("ArrowUp");
  await page
    .getByRole("button", { name: "Customize match", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Rounds", exact: true })
    .selectOption("1");
  await page.getByRole("button", { name: "Save match", exact: true }).click();
  await page
    .getByRole("button", { name: "Start match →", exact: true })
    .click();
  await page.waitForFunction(
    () => window.__TAGSPARK__.getState().world?.players.length === 2,
  );
  await page.evaluate(() => window.__TAGSPARK__.skipCountdown());
  const before = await page.evaluate(() =>
    window.__TAGSPARK__.getState().world.players.map((p) => p.x),
  );
  await page.keyboard.down("KeyD");
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.down("KeyW");
  await page.keyboard.down("ArrowUp");
  await page.waitForFunction(() =>
    // A solid overhead deck may correctly limit height on the selected map.
    window.__TAGSPARK__.getState().world.players.every((p) => p.y < 710),
  );
  await page.keyboard.up("KeyD");
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ArrowUp");
  const after = await page.evaluate(() =>
    window.__TAGSPARK__.getState().world.players.map((p) => p.x),
  );
  expect(after[0]).toBeGreaterThan(before[0]);
  expect(after[1]).toBeLessThan(before[1]);
  const it = await page.evaluate(() => window.__TAGSPARK__.getState().world.it);
  await page.evaluate(() => window.__TAGSPARK__.arrangeTag());
  await page.waitForFunction(
    (old) => window.__TAGSPARK__.getState().world.it !== old,
    it,
  );
  for (const kind of ["speed", "shield", "super"]) {
    await page.evaluate((k) => window.__TAGSPARK__.givePickup(k), kind);
    await page.waitForFunction(
      (k) =>
        window.__TAGSPARK__
          .getState()
          .world.players.some((p) => p.pickups[k] > 0),
      kind,
    );
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  const time = await page.evaluate(
    () => window.__TAGSPARK__.getState().world.remaining,
  );
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => window.__TAGSPARK__.getState().world.remaining),
  ).toBe(time);
  await page.getByRole("button", { name: "Keep playing", exact: true }).click();
  await page.evaluate(() => window.__TAGSPARK__.expireRound());
  await expect(
    page.getByRole("button", { name: "Rematch ↻", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rematch ↻", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ⅱ Pause", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
for (const n of [3, 4])
  test(`initializes ${n} players and preserves settings`, async ({ page }) => {
    await page.goto("/?test");
    await page.getByRole("button", { name: "Play →", exact: true }).click();
    for (const key of ["KeyW", "ArrowUp", "KeyT", "KeyI"].slice(0, n))
      await page.keyboard.press(key);
    await page
      .getByRole("button", { name: "Start match →", exact: true })
      .click();
    await page.waitForFunction(
      (count) => window.__TAGSPARK__.getState().world?.players.length === count,
      n,
    );
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.locator("canvas")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
test("landing and lobby have no serious accessibility violations or mobile overflow", async ({
  page,
}) => {
  await page.goto("/");
  let result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page.getByRole("button", { name: "Play →", exact: true }).click();
  result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
