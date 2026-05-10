import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/label-generator");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("keeps a visited app mounted while navigating through the shell", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { level: 1, name: "Label Generator" }),
  ).toBeVisible();

  await page.getByLabel("Additional Text").fill("Socket cap drawer");
  await page.getByRole("button", { name: /60 x 20/ }).click();

  await page.getByRole("tab", { name: /Bin Generator/ }).click();
  await expect(page).toHaveURL(/\/bin-generator$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Bin Generator" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: /Label Generator/ }).click();
  await expect(page).toHaveURL(/\/label-generator$/);
  await expect(page.getByLabel("Additional Text")).toHaveValue(
    "Socket cap drawer",
  );
});

test("restores label settings after a reload", async ({ page }) => {
  await page.getByLabel("Additional Text").fill("Reload me");

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const storedSettings = window.localStorage.getItem(
          "gridfinity-label-generator-settings",
        );

        return storedSettings ? JSON.parse(storedSettings).note : "";
      }),
    )
    .toBe("Reload me");

  await page.reload();
  await expect(page.getByLabel("Additional Text")).toHaveValue("Reload me");
});
