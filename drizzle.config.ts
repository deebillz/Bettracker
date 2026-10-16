import { defineConfig } from "drizzle-kit";

// `npm run db:generate` turns changes in shared/schema.ts into a new SQL file in ./migrations.
// The server applies pending migrations automatically when it starts.
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
});
