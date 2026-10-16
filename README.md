# BetTracker

Track sports bets, parlays and sportsbook odds boosts, and see your profit, ROI and win rate by month, sport and bet type.

## Run it locally

Requires Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5000
```

No database setup is needed locally: without `DATABASE_URL` the app uses an embedded Postgres (PGlite) saved in `./.data`. Delete that folder to start fresh.

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Odds, payout and boost math tests |
| `npm run check` | TypeScript type check |
| `npm run build` | Production build into `dist/` |
| `npm run db:generate` | After editing `shared/schema.ts`, creates a new SQL migration in `migrations/` |

Migrations run automatically when the server starts.

## Deploy for free (Render + Neon)

Both have free tiers. The Render free tier sleeps after 15 minutes without visitors, so the first visit after a break takes about a minute to load. That's fine while the app is private; move to a paid instance before launching subscriptions.

1. **Create the database (Neon).** Sign up at [neon.com](https://neon.com), create a project (region: US East), and copy the whole connection string (it starts with `postgresql://`).
2. **Create the app (Render).** Sign up at [render.com](https://render.com) with your GitHub account. Choose **New > Blueprint**, pick this repository, and Render reads `render.yaml`.
3. **Paste the connection string** when Render asks for `DATABASE_URL`, then click **Apply**.
4. Wait for the first deploy to finish (a few minutes), open the `.onrender.com` link, and create your account.

Every push to the main branch redeploys automatically.

## How it's built

- **Frontend:** React, Tailwind, shadcn/ui, Recharts (`client/`)
- **Backend:** Express 5 (`server/`)
- **Database:** Postgres via Drizzle ORM (`shared/schema.ts`, `migrations/`)
- **Shared math:** `shared/odds.ts` calculates payouts, parlay odds and boosts for both the form preview and settlement, so they always match.

### Security notes

- Passwords are hashed with scrypt; sessions are random tokens in an httpOnly, SameSite cookie, stored hashed in the database.
- Failed sign-ins are rate-limited (10 per 15 minutes per IP).
- Every bet query is scoped to the signed-in user; request bodies are validated and unknown fields are rejected.
- API logs record method, path, status and timing only, never request or response bodies.
