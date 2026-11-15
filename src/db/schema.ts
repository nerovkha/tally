import { relations } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

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
  baseCurrency: varchar("base_currency", { length: 3 })
    .notNull()
    .default("EUR"),
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
    category: varchar("category", { length: 24 }).notNull().default("general"),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    // Multiplier from expenses.currency to groups.baseCurrency, captured at creation
    fxRate: numeric("fx_rate", { precision: 16, scale: 8, mode: "number" })
      .notNull()
      .default(1),
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

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("invites_group_id_idx").on(t.groupId)],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // See ACTIVITY_TYPES in src/lib/activities.ts
    type: text("type").notNull(),
    expenseId: uuid("expense_id").references(() => expenses.id, {
      onDelete: "cascade",
    }),
    paymentId: uuid("payment_id").references(() => payments.id, {
      onDelete: "cascade",
    }),
    // Human-readable snapshot written when the event happened
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("activities_group_id_idx").on(t.groupId)],
);

export const groupsRelations = relations(groups, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  memberships: many(memberships),
  expenses: many(expenses),
  payments: many(payments),
  invites: many(invites),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  group: one(groups, { fields: [memberships.groupId], references: [groups.id] }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, { fields: [expenses.groupId], references: [groups.id] }),
  paidBy: one(users, { fields: [expenses.paidById], references: [users.id] }),
  splits: many(splits),
  comments: many(comments),
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

export const invitesRelations = relations(invites, ({ one }) => ({
  group: one(groups, { fields: [invites.groupId], references: [groups.id] }),
  createdByUser: one(users, {
    fields: [invites.createdBy],
    references: [users.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  group: one(groups, { fields: [activities.groupId], references: [groups.id] }),
  actor: one(users, { fields: [activities.actorId], references: [users.id] }),
  expense: one(expenses, {
    fields: [activities.expenseId],
    references: [expenses.id],
  }),
  payment: one(payments, {
    fields: [activities.paymentId],
    references: [payments.id],
  }),
}));

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("comments_expense_id_idx").on(t.expenseId)],
);

export const commentsRelations = relations(comments, ({ one }) => ({
  expense: one(expenses, {
    fields: [comments.expenseId],
    references: [expenses.id],
  }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentType: varchar("content_type", { length: 32 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("receipts_expense_id_idx").on(t.expenseId)],
);

export const receiptsRelations = relations(receipts, ({ one }) => ({
  expense: one(expenses, {
    fields: [receipts.expenseId],
    references: [expenses.id],
  }),
  uploadedByUser: one(users, {
    fields: [receipts.uploadedBy],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Split = typeof splits.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Receipt = typeof receipts.$inferSelect;
