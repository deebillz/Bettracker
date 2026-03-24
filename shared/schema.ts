import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  displayName: text("display_name").notNull(),
});

export const bets = sqliteTable("bets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  sport: text("sport").notNull(),
  betType: text("bet_type").notNull(), // moneyline, parlay, spread, total
  description: text("description").notNull(), // e.g. "Rangers ML -142"
  legs: text("legs"), // JSON array for parlay legs
  odds: text("odds").notNull(), // e.g. "-142", "+230", "+450"
  stake: real("stake").notNull(),
  result: text("result").notNull().default("pending"), // pending, won, lost, push
  payout: real("payout"), // null if pending
  profit: real("profit"), // null if pending (payout - stake, or -stake if lost)
  sportsbook: text("sportsbook").default("DraftKings"),
  notes: text("notes"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertBetSchema = createInsertSchema(bets).omit({ id: true });
export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof bets.$inferSelect;
