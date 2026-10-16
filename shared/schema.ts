import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per signed-in browser. The id is a SHA-256 hash of the cookie token,
// so a leaked database never exposes usable session tokens.
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const bets = pgTable(
  "bets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(), // YYYY-MM-DD
    sport: text("sport").notNull(),
    betType: text("bet_type").notNull(), // moneyline, spread, total, prop, parlay, futures, other
    description: text("description").notNull(),
    odds: integer("odds").notNull(), // American odds before any boost, e.g. -142 or 230
    stake: doublePrecision("stake").notNull(),
    // Profit boost: the book adds this % to the winnings (not the stake)
    boostPct: doublePrecision("boost_pct"),
    // Optional cap on the extra winnings a boost can add, in dollars
    boostMaxWin: doublePrecision("boost_max_win"),
    result: text("result").notNull().default("pending"), // pending, won, lost, push
    payout: doublePrecision("payout"), // total returned, null while pending
    profit: doublePrecision("profit"), // payout - stake, null while pending
    sportsbook: text("sportsbook"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (t) => [index("bets_user_date_idx").on(t.userId, t.date)],
);

export const betLegs = pgTable(
  "bet_legs",
  {
    id: serial("id").primaryKey(),
    betId: integer("bet_id")
      .notNull()
      .references(() => bets.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    sport: text("sport").notNull(),
    pick: text("pick").notNull(),
    odds: integer("odds").notNull(),
    result: text("result").notNull().default("pending"),
  },
  (t) => [index("bet_legs_bet_idx").on(t.betId)],
);

export type User = typeof users.$inferSelect;
export type Bet = typeof bets.$inferSelect;
export type BetLeg = typeof betLegs.$inferSelect;

/** What the API returns for a bet: the bet plus its parlay legs (empty for singles). */
export type BetWithLegs = Bet & { legs: BetLeg[] };

/** The signed-in user as the client sees it (never includes the password hash). */
export type PublicUser = Pick<User, "id" | "email" | "username" | "displayName">;
