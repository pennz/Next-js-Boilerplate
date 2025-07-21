CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'paused');--> statement-breakpoint
CREATE TABLE "health_goal" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type_id" integer NOT NULL,
	"target_value" numeric(10, 2) NOT NULL,
	"target_date" timestamp NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type_id" integer NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"recorded_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_reminder" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type_id" integer NOT NULL,
	"cron_expr" varchar(100) NOT NULL,
	"message" varchar(500) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"next_run_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"typical_range_low" numeric(10, 2),
	"typical_range_high" numeric(10, 2),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "health_type_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "health_goal" ADD CONSTRAINT "health_goal_type_id_health_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."health_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_record" ADD CONSTRAINT "health_record_type_id_health_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."health_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_reminder" ADD CONSTRAINT "health_reminder_type_id_health_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."health_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_goal_user_type_idx" ON "health_goal" USING btree ("user_id","type_id");--> statement-breakpoint
CREATE INDEX "health_record_user_recorded_at_idx" ON "health_record" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE INDEX "health_record_user_type_idx" ON "health_record" USING btree ("user_id","type_id");--> statement-breakpoint
CREATE INDEX "health_reminder_user_type_idx" ON "health_reminder" USING btree ("user_id","type_id");