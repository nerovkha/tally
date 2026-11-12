import { expect, type Page } from "@playwright/test";

export async function resetDatabase() {
  const response = await fetch("http://localhost:3000/api/testing/reset", {
    method: "POST",
  });
  expect(response.ok).toBeTruthy();
}

export async function registerUser(
  page: Page,
  name: string,
  email: string,
  password: string,
) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Register" }).click();
  await page.waitForURL("/groups");
}

export async function loginUser(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("/groups");
}

export async function logoutUser(page: Page, initial: string) {
  await page.getByRole("button", { name: initial, exact: true }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.waitForURL("/");
}

export async function createGroupViaUi(page: Page, name: string) {
  await page.getByRole("button", { name: "New group" }).click();
  await page.locator("#group-name").fill(name);
  await page.getByRole("button", { name: "Create group" }).click();
  await page.waitForURL(/\/groups\/[0-9a-f-]{36}$/);
}

export async function getInviteLink(page: Page) {
  await page.getByRole("button", { name: "Invite" }).click();
  const input = page.locator("#invite-url");
  await expect(input).toBeVisible({ timeout: 10000 });
  return input.inputValue();
}
