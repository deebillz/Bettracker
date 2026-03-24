import { users, bets, type User, type InsertUser, type Bet, type InsertBet } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUserByUsername(username: string): User | undefined;
  getUserById(id: number): User | undefined;
  createUser(user: InsertUser): User;

  // Bets (scoped by userId)
  getAllBets(userId: number): Bet[];
  getBetById(id: number): Bet | undefined;
  createBet(bet: InsertBet): Bet;
  updateBet(id: number, bet: Partial<InsertBet>): Bet | undefined;
  deleteBet(id: number): void;
}

export class DatabaseStorage implements IStorage {
  // --- Users ---
  getUserByUsername(username: string): User | undefined {
    return db.select().from(users).where(eq(users.username, username.toLowerCase())).get();
  }

  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  createUser(user: InsertUser): User {
    return db.insert(users).values({
      ...user,
      username: user.username.toLowerCase(),
    }).returning().get();
  }

  // --- Bets ---
  getAllBets(userId: number): Bet[] {
    return db.select().from(bets)
      .where(eq(bets.userId, userId))
      .orderBy(desc(bets.date), desc(bets.id))
      .all();
  }

  getBetById(id: number): Bet | undefined {
    return db.select().from(bets).where(eq(bets.id, id)).get();
  }

  createBet(bet: InsertBet): Bet {
    return db.insert(bets).values(bet).returning().get();
  }

  updateBet(id: number, updates: Partial<InsertBet>): Bet | undefined {
    return db.update(bets).set(updates).where(eq(bets.id, id)).returning().get();
  }

  deleteBet(id: number): void {
    db.delete(bets).where(eq(bets.id, id)).run();
  }
}

export const storage = new DatabaseStorage();
