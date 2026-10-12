ALTER TABLE "ai"."messages" ALTER COLUMN "content" SET DATA TYPE jsonb USING "content"::jsonb;--> statement-breakpoint
ALTER TABLE "ai"."messages" ADD COLUMN "meta" jsonb;