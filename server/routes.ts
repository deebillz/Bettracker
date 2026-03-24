import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { insertBetSchema } from "@shared/schema";

// Simple in-memory session store: token → userId
const sessions = new Map<string, number>();

// Hash a PIN with a simple salt
function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(`bettracker:${pin}`).digest("hex");
}

// Generate a session token
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Middleware to require auth — reads token from Authorization header
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  (req as any).userId = sessions.get(token)!;
  (req as any).token = token;
  next();
}

export async function registerRoutes(server: Server, app: Express) {
  // ========== Auth routes ==========

  // Register
  app.post("/api/auth/register", (req, res) => {
    const { username, pin, displayName } = req.body;

    if (!username || !pin || !displayName) {
      return res.status(400).json({ message: "Username, PIN, and display name are required" });
    }
    if (typeof pin !== "string" || pin.length < 4 || pin.length > 8) {
      return res.status(400).json({ message: "PIN must be 4-8 digits" });
    }
    if (!/^\d+$/.test(pin)) {
      return res.status(400).json({ message: "PIN must contain only numbers" });
    }
    if (typeof username !== "string" || username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: "Username must be 3-20 characters" });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
    }

    const existing = storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const user = storage.createUser({
      username: username.toLowerCase(),
      pinHash: hashPin(pin),
      displayName,
    });

    const token = generateToken();
    sessions.set(token, user.id);

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, displayName: user.displayName },
    });
  });

  // Login
  app.post("/api/auth/login", (req, res) => {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ message: "Username and PIN are required" });
    }

    const user = storage.getUserByUsername(username);
    if (!user || user.pinHash !== hashPin(pin)) {
      return res.status(401).json({ message: "Invalid username or PIN" });
    }

    const token = generateToken();
    sessions.set(token, user.id);

    res.json({
      token,
      user: { id: user.id, username: user.username, displayName: user.displayName },
    });
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = storage.getUserById((req as any).userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ id: user.id, username: user.username, displayName: user.displayName });
  });

  // Logout
  app.post("/api/auth/logout", requireAuth, (req, res) => {
    sessions.delete((req as any).token);
    res.json({ message: "Logged out" });
  });

  // ========== Bet routes (all require auth) ==========

  // Get all bets for current user
  app.get("/api/bets", requireAuth, (req, res) => {
    const allBets = storage.getAllBets((req as any).userId);
    res.json(allBets);
  });

  // Get single bet (verify ownership)
  app.get("/api/bets/:id", requireAuth, (req, res) => {
    const bet = storage.getBetById(parseInt(req.params.id));
    if (!bet || bet.userId !== (req as any).userId) {
      return res.status(404).json({ message: "Bet not found" });
    }
    res.json(bet);
  });

  // Create bet
  app.post("/api/bets", requireAuth, (req, res) => {
    const parsed = insertBetSchema.safeParse({
      ...req.body,
      userId: (req as any).userId,
    });
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid bet data", errors: parsed.error.issues });
    }
    const bet = storage.createBet(parsed.data);
    res.status(201).json(bet);
  });

  // Update bet (for settling results)
  app.patch("/api/bets/:id", requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const existing = storage.getBetById(id);
    if (!existing || existing.userId !== (req as any).userId) {
      return res.status(404).json({ message: "Bet not found" });
    }

    const updated = storage.updateBet(id, req.body);
    res.json(updated);
  });

  // Delete bet (verify ownership)
  app.delete("/api/bets/:id", requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const existing = storage.getBetById(id);
    if (!existing || existing.userId !== (req as any).userId) {
      return res.status(404).json({ message: "Bet not found" });
    }

    storage.deleteBet(id);
    res.status(204).send();
  });
}
