CREATE TYPE "public"."state" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "start" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "end" timestamp;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "state" "state" DEFAULT 'active' NOT NULL;