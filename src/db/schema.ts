import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.groupId] })],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    paidById: uuid("paid_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    splitType: text("split_type").notNull().default("equal"), // "equal" | "exact" | "percent"
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("expenses_group_id_idx").on(t.groupId)],
);

export const splits = pgTable(
  "splits",
  {
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.expenseId, t.userId] }),
    index("splits_user_id_idx").on(t.userId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("payments_group_id_idx").on(t.groupId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  groupsCreated: many(groups),
  expensesPaid: many(expenses),
  splits: many(splits),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  memberships: many(memberships),
  expenses: many(expenses),
  payments: many(payments),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  group: one(groups, { fields: [memberships.groupId], references: [groups.id] }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, { fields: [expenses.groupId], references: [groups.id] }),
  paidBy: one(users, { fields: [expenses.paidById], references: [users.id] }),
  splits: many(splits),
}));

export const splitsRelations = relations(splits, ({ one }) => ({
  expense: one(expenses, {
    fields: [splits.expenseId],
    references: [expenses.id],
  }),
  user: one(users, { fields: [splits.userId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  group: one(groups, { fields: [payments.groupId], references: [groups.id] }),
  fromUser: one(users, {
    fields: [payments.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, { fields: [payments.toUserId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Split = typeof splits.$inferSelect;
export type Payment = typeof payments.$inferSelect;
