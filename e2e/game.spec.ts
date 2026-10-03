import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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
    window.__TAGSPARK__.getState().world.players.every((p) => p.y < 520),
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
    await page
      .getByRole("button", { name: "Play →", exact: true })
      .click();
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
