import { test, expect } from "@playwright/test";

test("player faces stay inside their avatars in local and solo lobbies", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play →", exact: true }).click();
  for (const mode of ["Local multiplayer", "Solo vs AI"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    const faces = await page
      .locator(".player-card .avatar")
      .evaluateAll((avatars) =>
        avatars.map((avatar) => {
          const body = avatar.getBoundingClientRect();
          return [...avatar.children].every((child) => {
            const box = child.getBoundingClientRect();
            return (
              box.top >= body.top &&
              box.bottom <= body.bottom &&
              box.left >= body.left &&
              box.right <= body.right
            );
          });
        }),
      );
    expect(faces.every(Boolean)).toBe(true);
    await page.screenshot({
      path: `test-results/web-faces-${mode === "Solo vs AI" ? "solo" : "local"}.png`,
    });
  }
});
