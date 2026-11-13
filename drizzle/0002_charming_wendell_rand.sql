ALTER TABLE "expenses" ADD COLUMN "currency" varchar(3) DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "fx_rate" numeric(16, 8) DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "base_currency" varchar(3) DEFAULT 'EUR' NOT NULL;