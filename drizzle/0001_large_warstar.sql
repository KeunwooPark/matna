ALTER TABLE "events" ADD COLUMN "guests_can_edit" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "added_by" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_added_by_participants_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_deleted_by_participants_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;