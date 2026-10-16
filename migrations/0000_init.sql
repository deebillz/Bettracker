CREATE TABLE "bet_legs" (
	"id" serial PRIMARY KEY NOT NULL,
	"bet_id" integer NOT NULL,
	"position" integer NOT NULL,
	"sport" text NOT NULL,
	"pick" text NOT NULL,
	"odds" integer NOT NULL,
	"result" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"sport" text NOT NULL,
	"bet_type" text NOT NULL,
	"description" text NOT NULL,
	"odds" integer NOT NULL,
	"stake" double precision NOT NULL,
	"boost_pct" double precision,
	"boost_max_win" double precision,
	"result" text DEFAULT 'pending' NOT NULL,
	"payout" double precision,
	"profit" double precision,
	"sportsbook" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "bet_legs" ADD CONSTRAINT "bet_legs_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bet_legs_bet_idx" ON "bet_legs" USING btree ("bet_id");--> statement-breakpoint
CREATE INDEX "bets_user_date_idx" ON "bets" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");