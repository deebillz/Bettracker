import { and, asc, desc, eq, gt, inArray, lt, or } from "drizzle-orm";
import {
  users,
  sessions,
  bets,
  betLegs,
  type User,
  type Bet,
  type BetWithLegs,
} from "@shared/schema";
import { db } from "./db";

type NewBet = typeof bets.$inferInsert;
type NewLeg = Omit<typeof betLegs.$inferInsert, "betId" | "position">;
type BetUpdate = Partial<Omit<NewBet, "id" | "userId" | "createdAt">>;

export const storage = {
  // ---------- Users ----------
  async getUserByLogin(login: string): Promise<User | undefined> {
    const v = login.trim().toLowerCase();
    const [u] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, v), eq(users.username, v)))
      .limit(1);
    return u;
  },

  async findConflict(email: string, username: string): Promise<"email" | "username" | null> {
    const rows = await db
      .select({ email: users.email, username: users.username })
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)));
    if (rows.some((r) => r.email === email)) return "email";
    if (rows.some((r) => r.username === username)) return "username";
    return null;
  },

  async getUserById(id: number): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return u;
  },

  async createUser(u: typeof users.$inferInsert): Promise<User> {
    const [created] = await db.insert(users).values(u).returning();
    return created;
  },

  // ---------- Sessions ----------
  async createSession(id: string, userId: number, expiresAt: Date): Promise<void> {
    await db.insert(sessions).values({ id, userId, expiresAt });
  },

  async getSessionUser(id: string): Promise<User | undefined> {
    const [row] = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return row?.user;
  },

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  },

  async deleteExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  },

  // ---------- Bets (always scoped to the owner) ----------
  async listBets(userId: number): Promise<BetWithLegs[]> {
    const rows = await db
      .select()
      .from(bets)
      .where(eq(bets.userId, userId))
      .orderBy(desc(bets.date), desc(bets.id));
    if (rows.length === 0) return [];
    const legs = await db
      .select()
      .from(betLegs)
      .where(inArray(betLegs.betId, rows.map((b) => b.id)))
      .orderBy(asc(betLegs.position));
    return rows.map((b) => ({ ...b, legs: legs.filter((l) => l.betId === b.id) }));
  },

  async getBet(userId: number, id: number): Promise<BetWithLegs | undefined> {
    const [b] = await db
      .select()
      .from(bets)
      .where(and(eq(bets.id, id), eq(bets.userId, userId)))
      .limit(1);
    if (!b) return undefined;
    const legs = await db
      .select()
      .from(betLegs)
      .where(eq(betLegs.betId, id))
      .orderBy(asc(betLegs.position));
    return { ...b, legs };
  },

  async createBet(bet: NewBet, legs: NewLeg[]): Promise<BetWithLegs> {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(bets).values(bet).returning();
      const insertedLegs = legs.length
        ? await tx
            .insert(betLegs)
            .values(legs.map((l, i) => ({ ...l, betId: created.id, position: i })))
            .returning()
        : [];
      return { ...created, legs: insertedLegs };
    });
  },

  async updateBet(userId: number, id: number, updates: BetUpdate): Promise<Bet | undefined> {
    const [updated] = await db
      .update(bets)
      .set(updates)
      .where(and(eq(bets.id, id), eq(bets.userId, userId)))
      .returning();
    return updated;
  },

  async deleteBet(userId: number, id: number): Promise<boolean> {
    const deleted = await db
      .delete(bets)
      .where(and(eq(bets.id, id), eq(bets.userId, userId)))
      .returning({ id: bets.id });
    return deleted.length > 0;
  },
};
