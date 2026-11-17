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

    const list = page.locator("#expenses-list");
    await expect(list.getByText("Groceries")).toBeVisible();
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
    await expect(page.getByText("Bob paid Alice €15.25").first()).toBeVisible();
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

    const list = page.locator("#expenses-list");
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator("#description").fill("Bonus groceries");
    await page.locator("#amount").fill("40");
    await page.locator("#expense-category").click();
    await page.getByRole("option", { name: "🛒 Groceries" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Add expense" }).click();
    await expect(list.getByText("Bonus groceries")).toBeVisible();

    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator("#description").fill("Taxi to hostel");
    await page.locator("#amount").fill("12");
    await page.locator("#expense-category").click();
    await page.getByRole("option", { name: "🚕 Transport" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Add expense" }).click();
    await expect(list.getByText("Taxi to hostel")).toBeVisible();

    await expect(
      page.getByRole("listitem").filter({ hasText: "🛒 Groceries" }),
    ).toContainText("€40.00");
    await expect(
      page.getByRole("listitem").filter({ hasText: "🚕 Transport" }),
    ).toContainText("€12.00");

    await page.getByRole("link", { name: "🚕 Transport" }).click();
    await expect(list.getByText("Taxi to hostel")).toBeVisible();
    await expect(list.getByText("Bonus groceries")).toHaveCount(0);

    await page.getByRole("link", { name: "All", exact: true }).click();
    await expect(list.getByText("Bonus groceries")).toBeVisible();
  });

  test("the group page shows an activity timeline", async ({ page }) => {
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
    await page.locator("#description").fill("Groceries");
    await page.locator("#amount").fill("30.50");
    await page.getByRole("dialog").getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("Groceries").first()).toBeVisible();

    await expect(page.getByText("Alice created the group")).toBeVisible();
    await expect(page.getByText("Bob joined the group")).toBeVisible();
    await expect(
      page.getByText("Alice added “Groceries” · €30.50"),
    ).toBeVisible();
  });

  test("members can comment on an expense and delete their comments", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await createGroupViaUi(page, "Iceland trip");

    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator("#description").fill("Groceries");
    await page.locator("#amount").fill("30.50");
    await page.getByRole("dialog").getByRole("button", { name: "Add expense" }).click();
    const list = page.locator("#expenses-list");
    await expect(list.getByText("Groceries")).toBeVisible();

    await page.getByRole("button", { name: "Comments on Groceries" }).click();
    await expect(page.getByText("No comments yet")).toBeVisible();

    await page.locator("[id^='comment-body-']").fill("Split this with the others too");
    await page.getByRole("dialog").getByRole("button", { name: "Post" }).click();
    await expect(page.getByText("Alice Split this with the others too")).toBeVisible();

    await page.getByRole("button", { name: "Delete comment" }).click();
    await expect(page.getByText("Split this with the others too")).toHaveCount(0);
    await expect(page.getByText("No comments yet")).toBeVisible();
  });

  test("a receipt can be attached to an expense and downloaded", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await createGroupViaUi(page, "Iceland trip");

    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
    ]);

    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator("#description").fill("Groceries");
    await page.locator("#amount").fill("30.50");
    await page.locator("#receipt").setInputFiles({
      name: "receipt.png",
      mimeType: "image/png",
      buffer: png,
    });
    await page.getByRole("dialog").getByRole("button", { name: "Add expense" }).click();

    const list = page.locator("#expenses-list");
    await expect(list.getByText("Groceries")).toBeVisible();

    const link = page.getByRole("link", { name: "Receipt for Groceries" });
    await expect(link).toBeVisible();
    const href = (await link.getAttribute("href")) as string;
    const response = await page.request.get(href);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  });

  test("the dashboard summarizes balances, spending, and activity", async ({ page }) => {
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
    await page.locator("#description").fill("Groceries");
    await page.locator("#amount").fill("30.50");
    await page.getByRole("dialog").getByRole("button", { name: "Add expense" }).click();
    await expect(page.locator("#expenses-list").getByText("Groceries")).toBeVisible();

    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await expect(page.getByText("You are owed €15.25")).toBeVisible();
    await expect(page.getByText("Iceland trip").first()).toBeVisible();
    await expect(page.getByText("Monthly spending (EUR)")).toBeVisible();
    await expect(page.getByLabel(/Nov: €30\.50/)).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "General" }),
    ).toContainText("€30.50");
    await expect(page.getByText("Alice added “Groceries” · €30.50")).toBeVisible();
  });

  test("expense changes appear live for other members", async ({ page, browser }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await createGroupViaUi(page, "Iceland trip");
    const inviteUrl = await getInviteLink(page);
    await page.keyboard.press("Escape");
    await logoutUser(page, "A");

    const bobContext = await browser.newContext();
    const bobPage = await bobContext.newPage();
    await bobPage.goto("/register");
    await bobPage.getByLabel("Name").fill("Bob");
    await bobPage.getByLabel("Email").fill("bob@test.dev");
    await bobPage.getByLabel("Password").fill("password123");
    await bobPage.getByRole("button", { name: "Register" }).click();
    await bobPage.waitForURL("/groups");
    await bobPage.goto(inviteUrl);
    await bobPage.getByRole("button", { name: "Join group" }).click();
    await bobPage.getByRole("heading", { name: "Iceland trip" }).waitFor();

    const eventsReady = bobPage
      .waitForResponse((response) => response.url().includes("/events") && response.status() === 200)
      .catch(() => undefined);
    await bobPage.reload();
    await eventsReady;

    await loginUser(page, "alice@test.dev", "password123");
    await page.getByRole("link", { name: "Iceland trip" }).click();

    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator("#description").fill("Surprise dinner");
    await page.locator("#amount").fill("40");
    await page.getByRole("dialog").getByRole("button", { name: "Add expense" }).click();
    await expect(page.locator("#expenses-list").getByText("Surprise dinner")).toBeVisible();

    await expect(
      bobPage.locator("#expenses-list").getByText("Surprise dinner"),
    ).toBeVisible({ timeout: 15000 });
    await bobContext.close();
  });

  test("recurring expenses materialize when due", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await createGroupViaUi(page, "Iceland trip");

    await page.getByRole("button", { name: "Recurring" }).click();
    await page.locator("#recurring-description").fill("Rent");
    await page.locator("#recurring-amount").fill("800");
    await page.locator("#recurring-next").fill("2026-11-16");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Schedule recurring expense" })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.reload();
    const list = page.locator("#expenses-list");
    await expect(list.getByText("Rent")).toBeVisible();
    await expect(page.getByText("€800.00").first()).toBeVisible();
    await expect(
      page.getByText("Alice added “Rent” · €800.00 (recurring)"),
    ).toBeVisible();
  });

  test("the ledger can be searched and exported as csv", async ({ page }) => {
    await registerUser(page, "Alice", "alice@test.dev", "password123");
    await createGroupViaUi(page, "Iceland trip");
    const groupId = page.url().split("/").pop() as string;

    for (const [description, amount] of [
      ["Groceries run", "30.50"],
      ["Taxi to airport", "12"],
    ] as const) {
      await page.getByRole("button", { name: "Add expense" }).click();
      await page.locator("#description").fill(description);
      await page.locator("#amount").fill(amount);
      await page.getByRole("dialog").getByRole("button", { name: "Add expense" }).click();
      await expect(page.locator("#expenses-list").getByText(description)).toBeVisible();
    }

    await page.getByLabel("Search expenses").fill("taxi");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const list = page.locator("#expenses-list");
    await expect(list.getByText("Taxi to airport")).toBeVisible();
    await expect(list.getByText("Groceries run")).toHaveCount(0);

    await page.getByLabel("Search expenses").fill("");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(list.getByText("Groceries run")).toBeVisible();

    const response = await page.request.get(`/api/groups/${groupId}/export`);
    expect(response.status()).toBe(200);
    const csv = await response.text();
    expect(csv).toContain("Date,Description,Category,Paid by,Amount,Currency,Rate to EUR,Amount in EUR");
    expect(csv).toContain("Taxi to airport,general,Alice,12.00,EUR");
    expect(csv).toContain("Groceries run,general,Alice,30.50,EUR");

    const denied = await page.request.get(`/api/groups/${crypto.randomUUID()}/export`);
    expect(denied.status()).toBe(404);
  });

  test("admins manage the group and balances guard membership changes", async ({ page }) => {
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
    await page.locator("#description").fill("Groceries");
    await page.locator("#amount").fill("30.50");
    await page.getByRole("dialog").getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("owes €15.25")).toBeVisible();
    await logoutUser(page, "A");

    await loginUser(page, "bob@test.dev", "password123");
    await page.getByRole("link", { name: "Iceland trip" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Leave" }).click();
    await expect(page.getByText("Settle your balance before leaving this group")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Iceland trip" })).toBeVisible();

    await page.getByRole("button", { name: "Settle up" }).click();
    await page.locator("#paid-to").click();
    await page.getByRole("option", { name: "Alice" }).click();
    await page.locator("#settle-amount").fill("15.25");
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("settled up").first()).toBeVisible();
    await logoutUser(page, "B");

    await loginUser(page, "alice@test.dev", "password123");
    await page.getByRole("link", { name: "Iceland trip" }).click();
    await page.getByRole("button", { name: "Group settings" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Remove Bob" }).click();
    await expect(page.getByText("Bob removed")).toBeVisible();
    await expect(page.getByText("Alice removed Bob")).toBeVisible();

    await page.locator("#rename-group").fill("Flat 4B");
    await page.getByRole("button", { name: "Rename" }).click();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "Flat 4B" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Alice renamed the group to “Flat 4B”")).toBeVisible();
  });
});
