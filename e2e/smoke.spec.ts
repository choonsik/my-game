import { expect, test } from "@playwright/test";

test("첫 화면이 열리고 세 도시를 고를 수 있다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("날으는 직장인");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("날으는 직장인");
  for (const city of ["도쿄", "뉴욕", "파리"]) {
    await expect(page.getByRole("button", { name: `${city}(으)로 날아가기` })).toBeVisible();
  }
});
