import { test, expect } from "@playwright/test";
import path from "path";

test("open pdf, add text, export", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("input[type=file]").first();
  await input.setInputFiles(path.resolve(__dirname, "../../../public/sample.pdf"));
  await expect(page.getByText("Page 1")).toBeVisible();
  await page.getByRole("button", { name: "Text" }).click();
  page.once("dialog", (dialog) => dialog.accept("Hello"));
  await page.locator(".canvas-stack").first().click();
  await page.getByRole("button", { name: "Download PDF" }).click();
});
