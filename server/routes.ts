import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "./storage";
import {
  hashPassword,
  verifyPassword,
  getDummyHash,
  startSession,
  endSession,
  loadUser,
  requireAuth,
  toPublicUser,
} from "./auth";
import { parseAmericanOdds, parlayOdds, settleAmounts, type BetResult } from "@shared/odds";

// ---------- Validation ----------

const oddsField = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const n = parseAmericanOdds(v);
    if (n === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Odds must be American odds like -142 or +230" });
      return z.NEVER;
    }
    return n;
  });

const money = z.coerce.number().finite().nonnegative().max(10_000_000);
const shortText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const BET_TYPES = ["moneyline", "spread", "total", "prop", "parlay", "futures", "other"] as const;
const RESULTS = ["pending", "won", "lost", "push"] as const;

const legSchema = z.object({
  sport: shortText(40),
  pick: shortText(200),
  odds: oddsField,
});

const betFields = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  sport: shortText(40),
  betType: z.enum(BET_TYPES),
  description: shortText(300),
  odds: oddsField.optional(),
  stake: money.refine((n) => n > 0, "Stake must be more than 0"),
  boostPct: z.coerce.number().finite().min(0).max(1000).nullish(),
  boostMaxWin: money.nullish(),
  sportsbook: optionalText(60),
  notes: optionalText(2000),
};

const createBetSchema = z
  .object({ ...betFields, legs: z.array(legSchema).max(25).optional() })
  .strict()
  .superRefine((b, ctx) => {
    if (b.betType === "parlay" && (!b.legs || b.legs.length < 2)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["legs"], message: "A parlay needs at least 2 legs" });
    }
    if (b.betType !== "parlay" && b.odds === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["odds"], message: "Odds are required" });
    }
  });

// Edits can change the bet's details but never its owner, id or legs.
const updateBetSchema = z
  .object({
    date: betFields.date,
    sport: betFields.sport,
    description: betFields.description,
    odds: oddsField,
    stake: betFields.stake,
    boostPct: betFields.boostPct,
    boostMaxWin: betFields.boostMaxWin,
    sportsbook: betFields.sportsbook,
    notes: betFields.notes,
  })
  .partial()
  .strict();

const settleSchema = z
  .object({
    result: z.enum(RESULTS),
    payout: money.nullish(), // optional override, e.g. a cash-out or a reduced parlay
  })
  .strict();

const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,20}$/, "Username must be 3-20 letters, numbers or underscores"),
    displayName: shortText(50),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
  })
  .strict();

const loginSchema = z
  .object({
    login: z.string().trim().min(1).max(200),
    password: z.string().min(1).max(200),
  })
  .strict();

function badRequest(res: Response, error: z.ZodError) {
  const first = error.issues[0];
  return res.status(400).json({ message: first?.message ?? "Invalid request", errors: error.issues });
}

function parseId(req: Request): number | null {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ---------- Routes ----------

export function registerRoutes(app: Express) {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true, // only failed attempts count toward the limit
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many attempts. Try again in a few minutes." },
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api", loadUser);

  // ===== Auth =====

  app.post("/api/auth/register", authLimiter, async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error);
    const { email, username, displayName, password } = parsed.data;

    const conflict = await storage.findConflict(email, username);
    if (conflict === "email") return res.status(409).json({ message: "An account with that email already exists" });
    if (conflict === "username") return res.status(409).json({ message: "That username is taken" });

    const user = await storage.createUser({
      email,
      username,
      displayName,
      passwordHash: await hashPassword(password),
    });
    await startSession(res, user.id);
    res.status(201).json(toPublicUser(user));
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error);

    const user = await storage.getUserByLogin(parsed.data.login);
    const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !ok) return res.status(401).json({ message: "Wrong email/username or password" });

    await startSession(res, user.id);
    res.json(toPublicUser(user));
  });

  app.post("/api/auth/logout", async (req, res) => {
    await endSession(req, res);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json(toPublicUser(req.user!));
  });

  // ===== Bets (all scoped to the signed-in user) =====

  app.get("/api/bets", requireAuth, async (req, res) => {
    res.json(await storage.listBets(req.user!.id));
  });

  app.get("/api/bets/:id", requireAuth, async (req, res) => {
    const id = parseId(req);
    const bet = id && (await storage.getBet(req.user!.id, id));
    if (!bet) return res.status(404).json({ message: "Bet not found" });
    res.json(bet);
  });

  app.post("/api/bets", requireAuth, async (req, res) => {
    const parsed = createBetSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error);
    const { legs = [], ...b } = parsed.data;
    const isParlay = b.betType === "parlay";

    // For parlays, use the price the user entered (books often round differently),
    // otherwise the combined price of the legs.
    const odds = b.odds ?? (isParlay ? parlayOdds(legs.map((l) => l.odds)) : null);
    if (odds === null) return res.status(400).json({ message: "Odds are required" });

    const created = await storage.createBet(
      {
        ...b,
        odds,
        boostPct: b.boostPct || null,
        boostMaxWin: b.boostPct ? (b.boostMaxWin ?? null) : null,
        userId: req.user!.id,
        result: "pending",
      },
      isParlay ? legs : [],
    );
    res.status(201).json(created);
  });

  app.patch("/api/bets/:id", requireAuth, async (req, res) => {
    const id = parseId(req);
    const existing = id && (await storage.getBet(req.user!.id, id));
    if (!id || !existing) return res.status(404).json({ message: "Bet not found" });

    const parsed = updateBetSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error);

    const merged = { ...existing, ...parsed.data };
    const changes: Record<string, unknown> = { ...parsed.data };
    // Keep payout/profit consistent if the stake, odds or boost changed on a settled bet.
    const moneyChanged = ["stake", "odds", "boostPct", "boostMaxWin"].some((k) => k in parsed.data);
    if (existing.result !== "pending" && moneyChanged) {
      Object.assign(changes, settleAmounts(merged, existing.result as BetResult));
    }
    const updated = await storage.updateBet(req.user!.id, id, changes);
    res.json({ ...updated, legs: existing.legs });
  });

  app.post("/api/bets/:id/settle", requireAuth, async (req, res) => {
    const id = parseId(req);
    const existing = id && (await storage.getBet(req.user!.id, id));
    if (!id || !existing) return res.status(404).json({ message: "Bet not found" });

    const parsed = settleSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error);
    const { result, payout } = parsed.data;

    const amounts = settleAmounts(existing, result, result === "lost" ? null : payout);
    const updated = await storage.updateBet(req.user!.id, id, {
      result,
      ...amounts,
      settledAt: result === "pending" ? null : new Date(),
    });
    res.json({ ...updated, legs: existing.legs });
  });

  app.delete("/api/bets/:id", requireAuth, async (req, res) => {
    const id = parseId(req);
    const deleted = id ? await storage.deleteBet(req.user!.id, id) : false;
    if (!deleted) return res.status(404).json({ message: "Bet not found" });
    res.status(204).send();
  });

  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
}
