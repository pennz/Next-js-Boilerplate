CREATE TYPE "public"."difficulty_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."exercise_type" AS ENUM('strength', 'cardio', 'flexibility', 'balance', 'sports');--> statement-breakpoint
CREATE TYPE "public"."training_status" AS ENUM('scheduled', 'completed', 'skipped', 'in_progress');--> statement-breakpoint
CREATE TABLE "exercise_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"training_session_id" integer,
	"exercise_id" integer NOT NULL,
	"set_number" integer NOT NULL,
	"reps" integer,
	"weight" numeric(10, 2),
	"duration" integer,
	"distance" numeric(10, 2),
	"rest_duration" integer,
	"rpe" integer,
	"notes" varchar(500),
	"logged_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"exercise_type" "exercise_type" NOT NULL,
	"primary_muscle_group_id" integer NOT NULL,
	"secondary_muscle_group_ids" varchar(100),
	"instructions" varchar(1000),
	"difficulty" "difficulty_level" DEFAULT 'beginner' NOT NULL,
	"equipment_needed" varchar(200),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "muscle_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"body_part" varchar(50) NOT NULL,
	"description" varchar(200),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "muscle_group_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "training_plan" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"difficulty" "difficulty_level" DEFAULT 'beginner' NOT NULL,
	"duration_weeks" integer NOT NULL,
	"sessions_per_week" integer NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_session" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"training_plan_id" integer,
	"name" varchar(100) NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"actual_date" timestamp,
	"status" "training_status" DEFAULT 'scheduled' NOT NULL,
	"duration_minutes" integer,
	"notes" varchar(1000),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_exercise" (
	"id" serial PRIMARY KEY NOT NULL,
	"training_session_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"order" integer NOT NULL,
	"sets" integer NOT NULL,
	"target_reps" integer,
	"target_weight" numeric(10, 2),
	"target_duration" integer,
	"rest_seconds" integer,
	"notes" varchar(500),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_log" ADD CONSTRAINT "exercise_log_training_session_id_training_session_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_log" ADD CONSTRAINT "exercise_log_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_primary_muscle_group_id_muscle_group_id_fk" FOREIGN KEY ("primary_muscle_group_id") REFERENCES "public"."muscle_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_session" ADD CONSTRAINT "training_session_training_plan_id_training_plan_id_fk" FOREIGN KEY ("training_plan_id") REFERENCES "public"."training_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_training_session_id_training_session_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_log_user_logged_idx" ON "exercise_log" USING btree ("user_id","logged_at");--> statement-breakpoint
CREATE INDEX "exercise_log_session_exercise_idx" ON "exercise_log" USING btree ("training_session_id","exercise_id");--> statement-breakpoint
CREATE INDEX "exercise_type_idx" ON "exercise" USING btree ("exercise_type");--> statement-breakpoint
CREATE INDEX "exercise_primary_muscle_idx" ON "exercise" USING btree ("primary_muscle_group_id");--> statement-breakpoint
CREATE INDEX "training_plan_user_active_idx" ON "training_plan" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "training_session_user_date_idx" ON "training_session" USING btree ("user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "training_session_plan_date_idx" ON "training_session" USING btree ("training_plan_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "workout_exercise_session_order_idx" ON "workout_exercise" USING btree ("training_session_id","order");