import { test, expect } from "@playwright/test";
import {
  createGroupViaUi,
  getInviteLink,
  loginUser,
  logoutUser,
  registerUser,
  resetDatabase,
} from "./helpers";

test.describe("tally", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("registering lands on an empty groups page", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await expect(page.getByText("No groups yet")).toBeVisible();
  });

  test("login fails with the wrong password", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await logoutUser(page, "A");

    await page.goto("/login");
    await page.getByLabel("Email").fill("alice@test.dev");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText("Wrong email or password")).toBeVisible();
  });

  test("a user can log back in after logging out", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await logoutUser(page, "A");
    await loginUser(page, "alice@test.dev", "password123");
    await expect(page.getByText("No groups yet")).toBeVisible();

    await page.goto("/groups");
    await expect(page.getByText("No groups yet")).toBeVisible();
    await expect(page.getByText("Wrong email or password")).toHaveCount(0);
  });

  test("a user can create a group", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await createGroupViaUi(page, "Iceland trip");

    await expect(page.getByRole("heading", { name: "Iceland trip" })).toBeVisible();
    await expect(page.getByText("Members").first()).toBeVisible();
    await expect(page.getByText("Alice").first()).toBeVisible();
  });

  test("an invite link lets another user join the group", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await createGroupViaUi(page, "Iceland trip");
    const inviteUrl = await getInviteLink(page);
    await page.keyboard.press("Escape");
    await logoutUser(page, "A");

    await registerUser(page, "Bob", "bob@test.dev", "password123");
    await page.goto(inviteUrl);

    await expect(page.getByText("Join Iceland trip?")).toBeVisible();
    await page.getByRole("button", { name: "Join group" }).click();

    await expect(
      page.getByRole("heading", { name: "Iceland trip" }),
    ).toBeVisible();
    await expect(page.getByText("Bob").first()).toBeVisible();
  });

  test("an equal expense splits and moves the balances", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await createGroupViaUi(page, "Iceland trip");
    const inviteUrl = await getInviteLink(page);
    await page.keyboard.press("Escape");
    await logoutUser(page, "A");

    await registerUser(page, "Bob", "bob@test.dev", "password123");
    await page.goto(inviteUrl);
    await page.getByRole("button", { name: "Join group" }).click();
    await logoutUser(page, "B");

    await loginUser(page, "alice@test.dev", "password123");
    await page.getByRole("link", { name: "Iceland trip" }).click();

    await page.getByRole("button", { name: "Add expense" }).click();
    const dialog = page.getByRole("dialog");
    await page.locator("#description").fill("Groceries");
    await page.locator("#amount").fill("30.50");
    await dialog.getByRole("button", { name: "Add expense" }).click();

    await expect(page.getByText("Groceries")).toBeVisible();
    await expect(page.getByText("€30.50").first()).toBeVisible();
    await expect(page.getByText("gets €15.25")).toBeVisible();
    await expect(page.getByText("owes €15.25")).toBeVisible();
  });

  test("recording a payment settles everyone up", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await createGroupViaUi(page, "Iceland trip");
    const inviteUrl = await getInviteLink(page);
    await page.keyboard.press("Escape");
    await logoutUser(page, "A");

    await registerUser(page, "Bob", "bob@test.dev", "password123");
    await page.goto(inviteUrl);
    await page.getByRole("button", { name: "Join group" }).click();
    await logoutUser(page, "B");

    await loginUser(page, "alice@test.dev", "password123");
    await page.getByRole("link", { name: "Iceland trip" }).click();
    await page.getByRole("button", { name: "Add expense" }).click();
    const dialog = page.getByRole("dialog");
    await page.locator("#description").fill("Groceries");
    await page.locator("#amount").fill("30.50");
    await dialog.getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("owes €15.25")).toBeVisible();
    await logoutUser(page, "A");

    await loginUser(page, "bob@test.dev", "password123");
    await page.getByRole("link", { name: "Iceland trip" }).click();
    await page.getByRole("button", { name: "Record payment" }).click();

    await expect(page.getByText("settled up")).toHaveCount(2);
    await expect(page.getByText("Bob paid Alice €15.25")).toBeVisible();
  });

  test("a foreign currency expense converts into the group base currency", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await createGroupViaUi(page, "Iceland trip");
    const inviteUrl = await getInviteLink(page);
    await page.keyboard.press("Escape");
    await logoutUser(page, "A");

    await registerUser(page, "Bob", "bob@test.dev", "password123");
    await page.goto(inviteUrl);
    await page.getByRole("button", { name: "Join group" }).click();
    await logoutUser(page, "B");

    await loginUser(page, "alice@test.dev", "password123");
    await page.getByRole("link", { name: "Iceland trip" }).click();

    await page.getByRole("button", { name: "Add expense" }).click();
    const dialog = page.getByRole("dialog");
    await page.locator("#description").fill("Hostel night");
    await page.locator("#amount").fill("100");
    await page.locator("#expense-currency").click();
    await page.getByRole("option", { name: "USD", exact: true }).click();

    const rateInput = page.locator("#fx-rate");
    await expect(rateInput).toBeVisible();
    await expect(rateInput).toBeEnabled({ timeout: 10000 });
    await rateInput.fill("1.10");
    await expect(dialog.getByText("Counts as €110.00")).toBeVisible();

    await dialog.getByRole("button", { name: "Add expense" }).click();

    await expect(page.getByText("US$100.00").first()).toBeVisible();
    await expect(page.getByText("≈ €110.00").first()).toBeVisible();
    await expect(page.getByText("gets €55.00")).toBeVisible();
    await expect(page.getByText("owes €55.00")).toBeVisible();
  });

  test("expenses can be categorized, totaled, and filtered", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await createGroupViaUi(page, "Iceland trip");

    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator("#description").fill("Bonus groceries");
    await page.locator("#amount").fill("40");
    await page.locator("#expense-category").click();
    await page.getByRole("option", { name: "🛒 Groceries" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("Bonus groceries")).toBeVisible();

    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator("#description").fill("Taxi to hostel");
    await page.locator("#amount").fill("12");
    await page.locator("#expense-category").click();
    await page.getByRole("option", { name: "🚕 Transport" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("Taxi to hostel")).toBeVisible();

    await expect(
      page.getByRole("listitem").filter({ hasText: "🛒 Groceries" }),
    ).toContainText("€40.00");
    await expect(
      page.getByRole("listitem").filter({ hasText: "🚕 Transport" }),
    ).toContainText("€12.00");

    await page.getByRole("link", { name: "🚕 Transport" }).click();
    await expect(page.getByText("Taxi to hostel")).toBeVisible();
    await expect(page.getByText("Bonus groceries")).toHaveCount(0);

    await page.getByRole("link", { name: "All", exact: true }).click();
    await expect(page.getByText("Bonus groceries")).toBeVisible();
  });
});
