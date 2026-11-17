CREATE TABLE "recurring_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"category" varchar(24) DEFAULT 'general' NOT NULL,
	"frequency" text NOT NULL,
	"next_due_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_expenses_group_id_idx" ON "recurring_expenses" USING btree ("group_id");